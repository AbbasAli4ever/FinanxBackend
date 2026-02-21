import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { PRODUCT_TYPE_INFO, ProductType } from './constants/product-types.constant';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto, companyId: string) {
    // Check duplicate name
    const existingName = await this.prisma.product.findFirst({
      where: {
        companyId,
        name: { equals: dto.name, mode: 'insensitive' },
      },
    });
    if (existingName) {
      throw new ConflictException(`A product named "${dto.name}" already exists`);
    }

    // Check duplicate SKU
    if (dto.sku) {
      const existingSku = await this.prisma.product.findFirst({
        where: { companyId, sku: { equals: dto.sku, mode: 'insensitive' } },
      });
      if (existingSku) {
        throw new ConflictException(`A product with SKU "${dto.sku}" already exists`);
      }
    }

    // Validate category
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, companyId },
      });
      if (!category) {
        throw new BadRequestException('Category not found in your company');
      }
    }

    // Validate UOM
    if (dto.unitOfMeasureId) {
      const uom = await this.prisma.unitOfMeasure.findFirst({
        where: {
          id: dto.unitOfMeasureId,
          OR: [{ companyId: null }, { companyId }],
        },
      });
      if (!uom) {
        throw new BadRequestException('Unit of measure not found');
      }
    }

    // Validate accounts
    if (dto.incomeAccountId) {
      await this.validateAccount(dto.incomeAccountId, companyId, 'Income account');
    }
    if (dto.expenseAccountId) {
      await this.validateAccount(dto.expenseAccountId, companyId, 'Expense account');
    }
    if (dto.inventoryAssetAccountId) {
      await this.validateAccount(dto.inventoryAssetAccountId, companyId, 'Inventory asset account');
    }

    // Validate preferred vendor
    if (dto.preferredVendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: dto.preferredVendorId, companyId },
      });
      if (!vendor) {
        throw new BadRequestException('Preferred vendor not found in your company');
      }
    }

    // Determine trackInventory based on type
    const productType = dto.type as ProductType;
    const typeInfo = PRODUCT_TYPE_INFO[productType];
    const trackInventory = typeInfo?.trackInventory || false;

    // Validate bundle items
    if (productType === ProductType.BUNDLE) {
      if (!dto.bundleItems || dto.bundleItems.length === 0) {
        throw new BadRequestException(
          'Bundle products must include at least one item. Provide bundleItems array.',
        );
      }
      await this.validateBundleItems(dto.bundleItems, companyId);
    }

    // Auto-assign default accounts if not provided
    const defaults = await this.getDefaultAccounts(companyId, productType);

    // Build data
    const data: any = {
      companyId,
      type: productType,
      name: dto.name,
      sku: dto.sku || null,
      barcode: dto.barcode || null,
      categoryId: dto.categoryId || null,
      salesDescription: dto.salesDescription || null,
      purchaseDescription: dto.purchaseDescription || null,
      salesPrice: dto.salesPrice ?? null,
      purchaseCost: dto.purchaseCost ?? null,
      unitOfMeasureId: dto.unitOfMeasureId || null,
      incomeAccountId: dto.incomeAccountId || defaults.incomeAccountId,
      expenseAccountId: dto.expenseAccountId || defaults.expenseAccountId,
      inventoryAssetAccountId:
        trackInventory
          ? dto.inventoryAssetAccountId || defaults.inventoryAssetAccountId
          : null,
      taxable: dto.taxable ?? true,
      taxRate: dto.taxRate ?? null,
      trackInventory,
      quantityOnHand: trackInventory ? dto.quantityOnHand ?? 0 : 0,
      reorderPoint: trackInventory ? dto.reorderPoint ?? null : null,
      reorderQuantity: trackInventory ? dto.reorderQuantity ?? null : null,
      preferredVendorId: dto.preferredVendorId || null,
      imageUrl: dto.imageUrl || null,
    };

    // Use transaction for bundles
    if (productType === ProductType.BUNDLE && dto.bundleItems) {
      const result = await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data,
          include: this.getProductIncludes(),
        });

        for (const item of dto.bundleItems!) {
          await tx.bundleItem.create({
            data: {
              bundleId: product.id,
              productId: item.productId,
              quantity: item.quantity,
            },
          });
        }

        // Re-fetch with bundle items
        return tx.product.findUnique({
          where: { id: product.id },
          include: this.getProductIncludes(),
        });
      });

      return this.formatProduct(result);
    }

    const product = await this.prisma.product.create({
      data,
      include: this.getProductIncludes(),
    });

    return this.formatProduct(product);
  }

  async findAll(companyId: string, query: QueryProductsDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (query.type) where.type = query.type;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.trackInventory !== undefined) where.trackInventory = query.trackInventory;

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
        { salesDescription: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    orderBy[query.sortBy || 'name'] = query.sortOrder || 'asc';

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true } },
          unitOfMeasure: { select: { id: true, name: true, abbreviation: true } },
          preferredVendor: { select: { id: true, displayName: true } },
          _count: { select: { bundleItems: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: products.map((p) => this.formatProductListItem(p)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, companyId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId },
      include: this.getProductIncludes(),
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.formatProduct(product);
  }

  async update(id: string, dto: UpdateProductDto, companyId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check duplicate name
    if (dto.name && dto.name !== product.name) {
      const duplicate = await this.prisma.product.findFirst({
        where: {
          companyId,
          name: { equals: dto.name, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (duplicate) {
        throw new ConflictException(`A product named "${dto.name}" already exists`);
      }
    }

    // Check duplicate SKU
    if (dto.sku && dto.sku !== product.sku) {
      const duplicate = await this.prisma.product.findFirst({
        where: {
          companyId,
          sku: { equals: dto.sku, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (duplicate) {
        throw new ConflictException(`A product with SKU "${dto.sku}" already exists`);
      }
    }

    // Validate FKs
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, companyId },
      });
      if (!category) {
        throw new BadRequestException('Category not found in your company');
      }
    }

    if (dto.unitOfMeasureId) {
      const uom = await this.prisma.unitOfMeasure.findFirst({
        where: {
          id: dto.unitOfMeasureId,
          OR: [{ companyId: null }, { companyId }],
        },
      });
      if (!uom) {
        throw new BadRequestException('Unit of measure not found');
      }
    }

    if (dto.incomeAccountId) {
      await this.validateAccount(dto.incomeAccountId, companyId, 'Income account');
    }
    if (dto.expenseAccountId) {
      await this.validateAccount(dto.expenseAccountId, companyId, 'Expense account');
    }
    if (dto.inventoryAssetAccountId) {
      await this.validateAccount(dto.inventoryAssetAccountId, companyId, 'Inventory asset account');
    }

    if (dto.preferredVendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: dto.preferredVendorId, companyId },
      });
      if (!vendor) {
        throw new BadRequestException('Preferred vendor not found in your company');
      }
    }

    // Build update data
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.sku !== undefined) updateData.sku = dto.sku;
    if (dto.barcode !== undefined) updateData.barcode = dto.barcode;
    if (dto.categoryId !== undefined) updateData.categoryId = dto.categoryId;
    if (dto.salesDescription !== undefined) updateData.salesDescription = dto.salesDescription;
    if (dto.purchaseDescription !== undefined) updateData.purchaseDescription = dto.purchaseDescription;
    if (dto.salesPrice !== undefined) updateData.salesPrice = dto.salesPrice;
    if (dto.purchaseCost !== undefined) updateData.purchaseCost = dto.purchaseCost;
    if (dto.unitOfMeasureId !== undefined) updateData.unitOfMeasureId = dto.unitOfMeasureId;
    if (dto.incomeAccountId !== undefined) updateData.incomeAccountId = dto.incomeAccountId;
    if (dto.expenseAccountId !== undefined) updateData.expenseAccountId = dto.expenseAccountId;
    if (dto.inventoryAssetAccountId !== undefined) updateData.inventoryAssetAccountId = dto.inventoryAssetAccountId;
    if (dto.taxable !== undefined) updateData.taxable = dto.taxable;
    if (dto.taxRate !== undefined) updateData.taxRate = dto.taxRate;
    if (dto.reorderPoint !== undefined) updateData.reorderPoint = dto.reorderPoint;
    if (dto.reorderQuantity !== undefined) updateData.reorderQuantity = dto.reorderQuantity;
    if (dto.preferredVendorId !== undefined) updateData.preferredVendorId = dto.preferredVendorId;
    if (dto.imageUrl !== undefined) updateData.imageUrl = dto.imageUrl;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    // Handle bundle items update
    if (product.type === 'BUNDLE' && dto.bundleItems !== undefined) {
      await this.validateBundleItems(dto.bundleItems, companyId, id);

      const result = await this.prisma.$transaction(async (tx) => {
        // Delete existing bundle items
        await tx.bundleItem.deleteMany({ where: { bundleId: id } });

        // Create new ones
        for (const item of dto.bundleItems!) {
          await tx.bundleItem.create({
            data: {
              bundleId: id,
              productId: item.productId,
              quantity: item.quantity,
            },
          });
        }

        // Update product
        return tx.product.update({
          where: { id },
          data: updateData,
          include: this.getProductIncludes(),
        });
      });

      return this.formatProduct(result);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: updateData,
      include: this.getProductIncludes(),
    });

    return this.formatProduct(updated);
  }

  async delete(id: string, companyId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Soft delete
    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Product deactivated successfully' };
  }

  async adjustStock(id: string, dto: AdjustStockDto, companyId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.trackInventory) {
      throw new BadRequestException(
        'Stock adjustments can only be made on inventory-tracked products',
      );
    }

    const currentQty = Number(product.quantityOnHand);
    const newQty = currentQty + dto.adjustmentQuantity;

    if (newQty < 0) {
      throw new BadRequestException(
        `Insufficient stock. Current quantity: ${currentQty}. Cannot reduce by ${Math.abs(dto.adjustmentQuantity)}.`,
      );
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { quantityOnHand: newQty },
      include: this.getProductIncludes(),
    });

    return {
      ...this.formatProduct(updated),
      adjustment: {
        previousQuantity: currentQty,
        adjustmentQuantity: dto.adjustmentQuantity,
        newQuantity: newQty,
        reason: dto.reason,
        notes: dto.notes || null,
      },
    };
  }

  async findLowStock(companyId: string) {
    // Use raw query for comparing two columns (quantityOnHand <= reorderPoint)
    const lowStockProducts = await this.prisma.$queryRaw<any[]>`
      SELECT p.id, p.name, p.sku, p.quantity_on_hand, p.reorder_point, p.reorder_quantity,
             p.sales_price, p.purchase_cost, p.type,
             c.id as category_id, c.name as category_name,
             v.id as vendor_id, v.display_name as vendor_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN vendors v ON p.preferred_vendor_id = v.id
      WHERE p.company_id = ${companyId}::uuid
        AND p.is_active = true
        AND p.track_inventory = true
        AND p.reorder_point IS NOT NULL
        AND p.quantity_on_hand <= p.reorder_point
      ORDER BY (p.quantity_on_hand - p.reorder_point) ASC
    `;

    return lowStockProducts.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      type: p.type,
      quantityOnHand: Number(p.quantity_on_hand),
      reorderPoint: Number(p.reorder_point),
      reorderQuantity: p.reorder_quantity ? Number(p.reorder_quantity) : null,
      deficit: Number(p.reorder_point) - Number(p.quantity_on_hand),
      salesPrice: p.sales_price ? Number(p.sales_price) : null,
      purchaseCost: p.purchase_cost ? Number(p.purchase_cost) : null,
      category: p.category_id
        ? { id: p.category_id, name: p.category_name }
        : null,
      preferredVendor: p.vendor_id
        ? { id: p.vendor_id, displayName: p.vendor_name }
        : null,
    }));
  }

  async getProductTypes() {
    return Object.entries(PRODUCT_TYPE_INFO).map(([key, info]) => ({
      type: key,
      label: info.label,
      description: info.description,
      trackInventory: info.trackInventory,
    }));
  }

  // ===================== PRIVATE HELPERS =====================

  private async validateAccount(accountId: string, companyId: string, label: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, companyId },
    });
    if (!account) {
      throw new BadRequestException(`${label} not found in your company`);
    }
  }

  private async validateBundleItems(
    items: { productId: string; quantity: number }[],
    companyId: string,
    excludeBundleId?: string,
  ) {
    const productIds = items.map((i) => i.productId);

    // Check for duplicates in the array
    const uniqueIds = new Set(productIds);
    if (uniqueIds.size !== productIds.length) {
      throw new BadRequestException(
        'Bundle items contain duplicate products. Each product can only appear once.',
      );
    }

    // Check self-reference
    if (excludeBundleId && productIds.includes(excludeBundleId)) {
      throw new BadRequestException('A bundle cannot include itself as an item');
    }

    // Validate all products exist and are not bundles
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, companyId },
      select: { id: true, type: true, name: true },
    });

    if (products.length !== productIds.length) {
      const foundIds = products.map((p) => p.id);
      const missing = productIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Bundle item product(s) not found: ${missing.join(', ')}`,
      );
    }

    const bundleProducts = products.filter((p) => p.type === 'BUNDLE');
    if (bundleProducts.length > 0) {
      throw new BadRequestException(
        `Cannot add bundle products as items inside another bundle: ${bundleProducts.map((p) => p.name).join(', ')}`,
      );
    }
  }

  private async getDefaultAccounts(companyId: string, type: ProductType) {
    const defaults: any = {
      incomeAccountId: null,
      expenseAccountId: null,
      inventoryAssetAccountId: null,
    };

    // Try to find default income account
    if (type === ProductType.SERVICE) {
      const serviceIncome = await this.prisma.account.findFirst({
        where: { companyId, accountNumber: '4100' },
      });
      defaults.incomeAccountId = serviceIncome?.id || null;
    } else {
      const salesIncome = await this.prisma.account.findFirst({
        where: { companyId, accountNumber: '4000' },
      });
      defaults.incomeAccountId = salesIncome?.id || null;
    }

    // Try to find default expense account (COGS)
    if (type === ProductType.INVENTORY || type === ProductType.NON_INVENTORY) {
      const cogs = await this.prisma.account.findFirst({
        where: { companyId, accountNumber: '5000' },
      });
      defaults.expenseAccountId = cogs?.id || null;
    }

    // Try to find default inventory asset account
    if (type === ProductType.INVENTORY) {
      const inventoryAsset = await this.prisma.account.findFirst({
        where: { companyId, accountNumber: '1200' },
      });
      defaults.inventoryAssetAccountId = inventoryAsset?.id || null;
    }

    return defaults;
  }

  private getProductIncludes() {
    return {
      category: { select: { id: true, name: true, fullPath: true } },
      unitOfMeasure: { select: { id: true, name: true, abbreviation: true } },
      incomeAccount: { select: { id: true, name: true, accountNumber: true } },
      expenseAccount: { select: { id: true, name: true, accountNumber: true } },
      inventoryAssetAccount: { select: { id: true, name: true, accountNumber: true } },
      preferredVendor: { select: { id: true, displayName: true } },
      bundleItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              type: true,
              salesPrice: true,
              purchaseCost: true,
            },
          },
        },
      },
    };
  }

  private formatProduct(product: any) {
    if (!product) return null;

    return {
      id: product.id,
      type: product.type,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category || null,
      salesDescription: product.salesDescription,
      purchaseDescription: product.purchaseDescription,
      salesPrice: product.salesPrice ? Number(product.salesPrice) : null,
      purchaseCost: product.purchaseCost ? Number(product.purchaseCost) : null,
      unitOfMeasure: product.unitOfMeasure || null,
      incomeAccount: product.incomeAccount || null,
      expenseAccount: product.expenseAccount || null,
      inventoryAssetAccount: product.inventoryAssetAccount || null,
      taxable: product.taxable,
      taxRate: product.taxRate ? Number(product.taxRate) : null,
      trackInventory: product.trackInventory,
      quantityOnHand: Number(product.quantityOnHand),
      reorderPoint: product.reorderPoint ? Number(product.reorderPoint) : null,
      reorderQuantity: product.reorderQuantity
        ? Number(product.reorderQuantity)
        : null,
      preferredVendor: product.preferredVendor || null,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      bundleItems:
        product.bundleItems?.map((bi: any) => ({
          id: bi.id,
          quantity: Number(bi.quantity),
          product: {
            id: bi.product.id,
            name: bi.product.name,
            sku: bi.product.sku,
            type: bi.product.type,
            salesPrice: bi.product.salesPrice
              ? Number(bi.product.salesPrice)
              : null,
            purchaseCost: bi.product.purchaseCost
              ? Number(bi.product.purchaseCost)
              : null,
          },
        })) || [],
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private formatProductListItem(product: any) {
    return {
      id: product.id,
      type: product.type,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category || null,
      salesPrice: product.salesPrice ? Number(product.salesPrice) : null,
      purchaseCost: product.purchaseCost ? Number(product.purchaseCost) : null,
      unitOfMeasure: product.unitOfMeasure || null,
      taxable: product.taxable,
      trackInventory: product.trackInventory,
      quantityOnHand: Number(product.quantityOnHand),
      reorderPoint: product.reorderPoint ? Number(product.reorderPoint) : null,
      preferredVendor: product.preferredVendor || null,
      isActive: product.isActive,
      bundleItemsCount: product._count?.bundleItems || 0,
      createdAt: product.createdAt,
    };
  }
}
