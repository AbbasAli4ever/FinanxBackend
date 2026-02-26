import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { QueryPurchaseOrdersDto } from './dto/query-purchase-orders.dto';
import { ReceiveItemsDto } from './dto/receive-items.dto';
import { PURCHASE_ORDER_STATUS_INFO } from './constants/purchase-order-statuses.constant';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // GET NEXT PO NUMBER
  // =========================================================================
  async getNextPONumber(companyId: string): Promise<string> {
    const lastPO = await this.prisma.purchaseOrder.findFirst({
      where: { companyId },
      orderBy: { poNumber: 'desc' },
      select: { poNumber: true },
    });

    if (!lastPO) {
      return 'PO-0001';
    }

    const match = lastPO.poNumber.match(/PO-(\d+)/);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      return `PO-${String(nextNum).padStart(4, '0')}`;
    }

    const count = await this.prisma.purchaseOrder.count({ where: { companyId } });
    return `PO-${String(count + 1).padStart(4, '0')}`;
  }

  // =========================================================================
  // CREATE PURCHASE ORDER (DRAFT)
  // =========================================================================
  async create(dto: CreatePurchaseOrderDto, companyId: string) {
    // Validate vendor
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: dto.vendorId, companyId, isActive: true },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor not found or is inactive');
    }

    // Validate product IDs in line items
    const productIds = dto.lineItems
      .filter((li) => li.productId)
      .map((li) => li.productId!);

    if (productIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds }, companyId, isActive: true },
        select: { id: true },
      });
      const foundIds = new Set(products.map((p) => p.id));
      const missing = productIds.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        throw new NotFoundException(
          `Product(s) not found or inactive: ${missing.join(', ')}`,
        );
      }
    }

    // Validate expense account IDs in line items
    const expenseAccountIds = dto.lineItems
      .filter((li) => li.expenseAccountId)
      .map((li) => li.expenseAccountId!);

    if (expenseAccountIds.length > 0) {
      const accounts = await this.prisma.account.findMany({
        where: { id: { in: expenseAccountIds }, companyId, isActive: true },
        select: { id: true },
      });
      const foundIds = new Set(accounts.map((a) => a.id));
      const missing = expenseAccountIds.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        throw new NotFoundException(
          `Expense account(s) not found or inactive: ${missing.join(', ')}`,
        );
      }
    }

    // Generate PO number
    const poNumber = dto.poNumber || (await this.getNextPONumber(companyId));

    // Check for duplicate
    const existing = await this.prisma.purchaseOrder.findUnique({
      where: {
        unique_company_po_number: { companyId, poNumber },
      },
    });
    if (existing) {
      throw new ConflictException(`PO number "${poNumber}" already exists`);
    }

    // Calculate line items
    const calculatedLineItems = this.calculateLineItems(dto.lineItems);

    // Calculate totals
    const totals = this.calculateTotals(
      calculatedLineItems,
      dto.discountType,
      dto.discountValue,
    );

    const po = await this.prisma.$transaction(async (tx) => {
      return tx.purchaseOrder.create({
        data: {
          companyId,
          vendorId: dto.vendorId,
          poNumber,
          referenceNumber: dto.referenceNumber,
          status: 'DRAFT',
          poDate: new Date(dto.poDate),
          expectedDeliveryDate: dto.expectedDeliveryDate
            ? new Date(dto.expectedDeliveryDate)
            : null,
          paymentTerms: dto.paymentTerms,
          subtotal: totals.subtotal,
          discountType: dto.discountType || null,
          discountValue: dto.discountValue || null,
          discountAmount: totals.discountAmount,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          shippingAddressLine1: dto.shippingAddressLine1,
          shippingAddressLine2: dto.shippingAddressLine2,
          shippingCity: dto.shippingCity,
          shippingState: dto.shippingState,
          shippingPostalCode: dto.shippingPostalCode,
          shippingCountry: dto.shippingCountry,
          notes: dto.notes,
          memo: dto.memo,
          vendorMessage: dto.vendorMessage,
          lineItems: {
            create: calculatedLineItems,
          },
        },
        include: this.getFullInclude(),
      });
    });

    return this.formatPurchaseOrder(po);
  }

  // =========================================================================
  // FIND ALL (WITH FILTERS)
  // =========================================================================
  async findAll(companyId: string, query: QueryPurchaseOrdersDto) {
    const {
      status,
      vendorId,
      dateFrom,
      dateTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = query;

    const where: any = { companyId, isActive: true };

    if (status) {
      where.status = status;
    }

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (dateFrom || dateTo) {
      where.poDate = {};
      if (dateFrom) where.poDate.gte = new Date(dateFrom);
      if (dateTo) where.poDate.lte = new Date(dateTo);
    }

    if (search) {
      where.OR = [
        { poNumber: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        {
          vendor: {
            displayName: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: {
          vendor: {
            select: { id: true, displayName: true, email: true },
          },
          _count: { select: { lineItems: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      items: items.map((po) => this.formatPurchaseOrderListItem(po)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =========================================================================
  // FIND ONE
  // =========================================================================
  async findOne(id: string, companyId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId, isActive: true },
      include: this.getFullInclude(),
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    return this.formatPurchaseOrder(po);
  }

  // =========================================================================
  // UPDATE (DRAFT ONLY)
  // =========================================================================
  async update(id: string, dto: UpdatePurchaseOrderDto, companyId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId, isActive: true },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft purchase orders can be edited. This PO has been sent or processed.',
      );
    }

    // Validate vendor if changing
    if (dto.vendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: dto.vendorId, companyId, isActive: true },
      });
      if (!vendor) {
        throw new NotFoundException('Vendor not found or is inactive');
      }
    }

    let lineItemsData: any = undefined;
    let totals: any = {};

    if (dto.lineItems) {
      // Validate product IDs
      const productIds = dto.lineItems
        .filter((li) => li.productId)
        .map((li) => li.productId!);

      if (productIds.length > 0) {
        const products = await this.prisma.product.findMany({
          where: { id: { in: productIds }, companyId, isActive: true },
          select: { id: true },
        });
        const foundIds = new Set(products.map((p) => p.id));
        const missing = productIds.filter((pid) => !foundIds.has(pid));
        if (missing.length > 0) {
          throw new NotFoundException(
            `Product(s) not found or inactive: ${missing.join(', ')}`,
          );
        }
      }

      // Validate expense account IDs
      const expenseAccountIds = dto.lineItems
        .filter((li) => li.expenseAccountId)
        .map((li) => li.expenseAccountId!);

      if (expenseAccountIds.length > 0) {
        const accounts = await this.prisma.account.findMany({
          where: { id: { in: expenseAccountIds }, companyId, isActive: true },
          select: { id: true },
        });
        const foundIds = new Set(accounts.map((a) => a.id));
        const missing = expenseAccountIds.filter((aid) => !foundIds.has(aid));
        if (missing.length > 0) {
          throw new NotFoundException(
            `Expense account(s) not found or inactive: ${missing.join(', ')}`,
          );
        }
      }

      lineItemsData = this.calculateLineItems(dto.lineItems);

      const discountType = dto.discountType ?? (po.discountType as any);
      const discountValue =
        dto.discountValue ?? Number(po.discountValue || 0);

      totals = this.calculateTotals(lineItemsData, discountType, discountValue);
    } else if (
      dto.discountType !== undefined ||
      dto.discountValue !== undefined
    ) {
      // Recalculate with existing line items
      const existingLineItems = await this.prisma.purchaseOrderLineItem.findMany({
        where: { purchaseOrderId: id },
      });

      const mapped = existingLineItems.map((li) => ({
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
        discountPercent: Number(li.discountPercent),
        taxPercent: Number(li.taxPercent),
      }));

      const discountType = dto.discountType ?? (po.discountType as any);
      const discountValue =
        dto.discountValue ?? Number(po.discountValue || 0);

      totals = this.calculateTotals(mapped, discountType, discountValue);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (lineItemsData) {
        await tx.purchaseOrderLineItem.deleteMany({
          where: { purchaseOrderId: id },
        });
      }

      const updateData: any = {
        ...(dto.vendorId && { vendorId: dto.vendorId }),
        ...(dto.referenceNumber !== undefined && {
          referenceNumber: dto.referenceNumber,
        }),
        ...(dto.poDate && { poDate: new Date(dto.poDate) }),
        ...(dto.expectedDeliveryDate !== undefined && {
          expectedDeliveryDate: dto.expectedDeliveryDate
            ? new Date(dto.expectedDeliveryDate)
            : null,
        }),
        ...(dto.paymentTerms !== undefined && {
          paymentTerms: dto.paymentTerms,
        }),
        ...(dto.discountType !== undefined && {
          discountType: dto.discountType || null,
        }),
        ...(dto.discountValue !== undefined && {
          discountValue: dto.discountValue,
        }),
        ...(dto.shippingAddressLine1 !== undefined && {
          shippingAddressLine1: dto.shippingAddressLine1,
        }),
        ...(dto.shippingAddressLine2 !== undefined && {
          shippingAddressLine2: dto.shippingAddressLine2,
        }),
        ...(dto.shippingCity !== undefined && {
          shippingCity: dto.shippingCity,
        }),
        ...(dto.shippingState !== undefined && {
          shippingState: dto.shippingState,
        }),
        ...(dto.shippingPostalCode !== undefined && {
          shippingPostalCode: dto.shippingPostalCode,
        }),
        ...(dto.shippingCountry !== undefined && {
          shippingCountry: dto.shippingCountry,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
        ...(dto.vendorMessage !== undefined && {
          vendorMessage: dto.vendorMessage,
        }),
        ...totals,
      };

      if (lineItemsData) {
        updateData.lineItems = { create: lineItemsData };
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: updateData,
        include: this.getFullInclude(),
      });
    });

    return this.formatPurchaseOrder(updated);
  }

  // =========================================================================
  // DELETE (DRAFT ONLY)
  // =========================================================================
  async delete(id: string, companyId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId, isActive: true },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft purchase orders can be deleted. To remove a sent PO, void it instead.',
      );
    }

    await this.prisma.purchaseOrder.delete({ where: { id } });

    return { message: `Purchase order ${po.poNumber} has been deleted` };
  }

  // =========================================================================
  // SEND (DRAFT → SENT)
  // =========================================================================
  async send(id: string, companyId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId, isActive: true },
      include: { lineItems: true },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== 'DRAFT') {
      throw new BadRequestException('Only draft purchase orders can be sent.');
    }

    if (po.lineItems.length === 0) {
      throw new BadRequestException(
        'Cannot send a purchase order with no line items',
      );
    }

    // Default expected delivery date (30 days from PO date) if not set
    let expectedDeliveryDate = po.expectedDeliveryDate;
    if (!expectedDeliveryDate) {
      expectedDeliveryDate = new Date(po.poDate);
      expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + 30);
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        expectedDeliveryDate,
      },
      include: this.getFullInclude(),
    });

    return this.formatPurchaseOrder(updated);
  }

  // =========================================================================
  // RECEIVE ITEMS (SENT/PARTIAL → PARTIAL/RECEIVED)
  // =========================================================================
  async receive(id: string, companyId: string, dto: ReceiveItemsDto) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId, isActive: true },
      include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    const allowedStatuses = ['SENT', 'PARTIAL'];
    if (!allowedStatuses.includes(po.status)) {
      throw new BadRequestException(
        `Only sent or partially received purchase orders can receive items. Current status: ${po.status}`,
      );
    }

    // Build a map of existing line items
    const lineItemMap = new Map(po.lineItems.map((li) => [li.id, li]));

    // Validate each receive item
    for (const item of dto.items) {
      const lineItem = lineItemMap.get(item.lineItemId);
      if (!lineItem) {
        throw new BadRequestException(
          `Line item ${item.lineItemId} not found in this purchase order`,
        );
      }

      const newTotal = Number(lineItem.quantityReceived) + item.quantityReceived;
      if (newTotal > Number(lineItem.quantity)) {
        throw new BadRequestException(
          `Cannot receive ${item.quantityReceived} for "${lineItem.description}". ` +
            `Already received ${Number(lineItem.quantityReceived)} of ${Number(lineItem.quantity)}.`,
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Update each line item's quantityReceived
      for (const item of dto.items) {
        await tx.purchaseOrderLineItem.update({
          where: { id: item.lineItemId },
          data: {
            quantityReceived: {
              increment: item.quantityReceived,
            },
          },
        });
      }

      // Re-query all line items to check completion status
      const updatedLineItems = await tx.purchaseOrderLineItem.findMany({
        where: { purchaseOrderId: id },
      });

      const allFullyReceived = updatedLineItems.every(
        (li) => Number(li.quantityReceived) >= Number(li.quantity),
      );

      // Determine new status
      const newStatus = allFullyReceived ? 'RECEIVED' : 'PARTIAL';

      const updateData: any = { status: newStatus };
      if (allFullyReceived) {
        updateData.receivedAt = new Date();
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: updateData,
        include: this.getFullInclude(),
      });
    });

    return this.formatPurchaseOrder(result);
  }

  // =========================================================================
  // CONVERT TO BILL (RECEIVED/PARTIAL → CLOSED)
  // =========================================================================
  async convertToBill(id: string, companyId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId, isActive: true },
      include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    const allowedStatuses = ['RECEIVED', 'PARTIAL'];
    if (!allowedStatuses.includes(po.status)) {
      throw new BadRequestException(
        'Only received or partially received purchase orders can be converted to bills. ' +
          `Current status: ${po.status}`,
      );
    }

    if (po.convertedBillId) {
      throw new BadRequestException(
        'This purchase order has already been converted to a bill.',
      );
    }

    // Only include lines that have received items
    const receivedLines = po.lineItems.filter(
      (li) => Number(li.quantityReceived) > 0,
    );

    if (receivedLines.length === 0) {
      throw new BadRequestException(
        'No items have been received. Cannot convert to bill.',
      );
    }

    // Generate next bill number
    const lastBill = await this.prisma.bill.findFirst({
      where: { companyId },
      orderBy: { billNumber: 'desc' },
      select: { billNumber: true },
    });

    let billNumber = 'BILL-0001';
    if (lastBill) {
      const match = lastBill.billNumber.match(/BILL-(\d+)/);
      if (match) {
        const nextNum = parseInt(match[1], 10) + 1;
        billNumber = `BILL-${String(nextNum).padStart(4, '0')}`;
      } else {
        const count = await this.prisma.bill.count({ where: { companyId } });
        billNumber = `BILL-${String(count + 1).padStart(4, '0')}`;
      }
    }

    // Recalculate amounts based on received quantities
    const billLineItems = receivedLines.map((li) => {
      const qty = Number(li.quantityReceived);
      const unitPrice = Number(li.unitPrice);
      const discountPercent = Number(li.discountPercent);
      const taxPercent = Number(li.taxPercent);

      const lineSubtotal = qty * unitPrice;
      const discountAmount = lineSubtotal * (discountPercent / 100);
      const afterDiscount = lineSubtotal - discountAmount;
      const taxAmount = afterDiscount * (taxPercent / 100);
      const amount = Math.round((afterDiscount + taxAmount) * 10000) / 10000;

      return {
        productId: li.productId,
        expenseAccountId: li.expenseAccountId,
        description: li.description,
        quantity: qty,
        unitPrice,
        discountPercent,
        taxPercent,
        amount,
        sortOrder: li.sortOrder,
      };
    });

    // Calculate bill totals
    const billTotals = this.calculateTotals(
      billLineItems,
      po.discountType as any,
      po.discountValue ? Number(po.discountValue) : null,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      // Create the bill
      const bill = await tx.bill.create({
        data: {
          companyId,
          vendorId: po.vendorId,
          billNumber,
          referenceNumber: po.poNumber,
          status: 'DRAFT',
          billDate: new Date(),
          paymentTerms: po.paymentTerms,
          subtotal: billTotals.subtotal,
          discountType: po.discountType,
          discountValue: po.discountValue,
          discountAmount: billTotals.discountAmount,
          taxAmount: billTotals.taxAmount,
          totalAmount: billTotals.totalAmount,
          amountPaid: 0,
          amountDue: billTotals.totalAmount,
          notes: `Created from Purchase Order ${po.poNumber}`,
          memo: po.memo,
        },
      });

      // Create bill line items
      await tx.billLineItem.createMany({
        data: billLineItems.map((li) => ({
          billId: bill.id,
          productId: li.productId,
          expenseAccountId: li.expenseAccountId,
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          discountPercent: li.discountPercent,
          taxPercent: li.taxPercent,
          amount: li.amount,
          sortOrder: li.sortOrder,
        })),
      });

      // Update PO status to CLOSED and link to bill
      const updatedPO = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          convertedBillId: bill.id,
        },
        include: this.getFullInclude(),
      });

      return {
        purchaseOrder: updatedPO,
        billId: bill.id,
        billNumber: bill.billNumber,
      };
    });

    return {
      ...this.formatPurchaseOrder(result.purchaseOrder),
      convertedBill: {
        id: result.billId,
        billNumber: result.billNumber,
      },
    };
  }

  // =========================================================================
  // DUPLICATE (CLONE)
  // =========================================================================
  async duplicate(id: string, companyId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId, isActive: true },
      include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    const newPONumber = await this.getNextPONumber(companyId);

    const duplicated = await this.prisma.$transaction(async (tx) => {
      const created = await tx.purchaseOrder.create({
        data: {
          companyId,
          vendorId: po.vendorId,
          poNumber: newPONumber,
          referenceNumber: null,
          status: 'DRAFT',
          poDate: new Date(),
          expectedDeliveryDate: null,
          paymentTerms: po.paymentTerms,
          subtotal: po.subtotal,
          discountType: po.discountType,
          discountValue: po.discountValue,
          discountAmount: po.discountAmount,
          taxAmount: po.taxAmount,
          totalAmount: po.totalAmount,
          shippingAddressLine1: po.shippingAddressLine1,
          shippingAddressLine2: po.shippingAddressLine2,
          shippingCity: po.shippingCity,
          shippingState: po.shippingState,
          shippingPostalCode: po.shippingPostalCode,
          shippingCountry: po.shippingCountry,
          notes: po.notes,
          memo: po.memo,
          vendorMessage: po.vendorMessage,
        },
      });

      // Copy line items (reset quantityReceived to 0)
      if (po.lineItems.length > 0) {
        await tx.purchaseOrderLineItem.createMany({
          data: po.lineItems.map((li) => ({
            purchaseOrderId: created.id,
            productId: li.productId,
            expenseAccountId: li.expenseAccountId,
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            discountPercent: li.discountPercent,
            taxPercent: li.taxPercent,
            amount: li.amount,
            quantityReceived: 0,
            sortOrder: li.sortOrder,
          })),
        });
      }

      return tx.purchaseOrder.findFirst({
        where: { id: created.id },
        include: this.getFullInclude(),
      });
    });

    return this.formatPurchaseOrder(duplicated!);
  }

  // =========================================================================
  // CLOSE (RECEIVED/PARTIAL → CLOSED)
  // =========================================================================
  async close(id: string, companyId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId, isActive: true },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    const allowedStatuses = ['RECEIVED', 'PARTIAL'];
    if (!allowedStatuses.includes(po.status)) {
      throw new BadRequestException(
        `Only received or partially received purchase orders can be closed. Current status: ${po.status}`,
      );
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
      include: this.getFullInclude(),
    });

    return this.formatPurchaseOrder(updated);
  }

  // =========================================================================
  // VOID (SENT/PARTIAL → VOID)
  // =========================================================================
  async voidPO(id: string, companyId: string, reason?: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId, isActive: true },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    const allowedStatuses = ['SENT', 'PARTIAL'];
    if (!allowedStatuses.includes(po.status)) {
      if (po.status === 'DRAFT') {
        throw new BadRequestException(
          'Draft purchase orders should be deleted, not voided.',
        );
      }
      if (po.status === 'CLOSED') {
        throw new BadRequestException(
          'Closed purchase orders cannot be voided. Void the resulting bill instead.',
        );
      }
      throw new BadRequestException(
        `Cannot void a purchase order with status "${po.status}"`,
      );
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'VOID',
        voidedAt: new Date(),
        voidReason: reason || 'Voided by user',
      },
      include: this.getFullInclude(),
    });

    return this.formatPurchaseOrder(updated);
  }

  // =========================================================================
  // GET SUMMARY (DASHBOARD STATS)
  // =========================================================================
  async getSummary(companyId: string) {
    const now = new Date();

    const [
      draftCount,
      sentAgg,
      partialAgg,
      receivedAgg,
      closedAgg,
      voidCount,
    ] = await Promise.all([
      this.prisma.purchaseOrder.count({
        where: { companyId, isActive: true, status: 'DRAFT' },
      }),
      this.prisma.purchaseOrder.aggregate({
        where: { companyId, isActive: true, status: 'SENT' },
        _count: true,
        _sum: { totalAmount: true },
      }),
      this.prisma.purchaseOrder.aggregate({
        where: { companyId, isActive: true, status: 'PARTIAL' },
        _count: true,
        _sum: { totalAmount: true },
      }),
      this.prisma.purchaseOrder.aggregate({
        where: { companyId, isActive: true, status: 'RECEIVED' },
        _count: true,
        _sum: { totalAmount: true },
      }),
      this.prisma.purchaseOrder.aggregate({
        where: { companyId, isActive: true, status: 'CLOSED' },
        _count: true,
        _sum: { totalAmount: true },
      }),
      this.prisma.purchaseOrder.count({
        where: { companyId, isActive: true, status: 'VOID' },
      }),
    ]);

    // Overdue delivery count (SENT/PARTIAL with expectedDeliveryDate < today)
    const overdueDelivery = await this.prisma.purchaseOrder.aggregate({
      where: {
        companyId,
        isActive: true,
        status: { in: ['SENT', 'PARTIAL'] },
        expectedDeliveryDate: { lt: now },
      },
      _count: true,
      _sum: { totalAmount: true },
    });

    const totalPending =
      Number(sentAgg._sum.totalAmount || 0) +
      Number(partialAgg._sum.totalAmount || 0);

    const totalReceived =
      Number(receivedAgg._sum.totalAmount || 0) +
      Number(closedAgg._sum.totalAmount || 0);

    return {
      draft: { count: draftCount },
      sent: {
        count: sentAgg._count,
        amount: Number(sentAgg._sum.totalAmount || 0),
      },
      partial: {
        count: partialAgg._count,
        amount: Number(partialAgg._sum.totalAmount || 0),
      },
      received: {
        count: receivedAgg._count,
        amount: Number(receivedAgg._sum.totalAmount || 0),
      },
      closed: {
        count: closedAgg._count,
        amount: Number(closedAgg._sum.totalAmount || 0),
      },
      void: { count: voidCount },
      overdueDelivery: {
        count: overdueDelivery._count,
        amount: Number(overdueDelivery._sum.totalAmount || 0),
      },
      totals: {
        totalPending: Math.round(totalPending * 100) / 100,
        totalReceived: Math.round(totalReceived * 100) / 100,
      },
    };
  }

  // =========================================================================
  // GET STATUSES
  // =========================================================================
  getStatuses() {
    return Object.entries(PURCHASE_ORDER_STATUS_INFO).map(([key, value]) => ({
      value: key,
      ...value,
    }));
  }

  // =========================================================================
  // PRIVATE HELPERS
  // =========================================================================
  private calculateLineItems(lineItems: any[]) {
    return lineItems.map((li, index) => {
      const quantity = li.quantity;
      const unitPrice = li.unitPrice;
      const discountPercent = li.discountPercent || 0;
      const taxPercent = li.taxPercent || 0;

      const lineSubtotal = quantity * unitPrice;
      const discountAmount = lineSubtotal * (discountPercent / 100);
      const afterDiscount = lineSubtotal - discountAmount;
      const taxAmount = afterDiscount * (taxPercent / 100);
      const amount = afterDiscount + taxAmount;

      return {
        productId: li.productId || null,
        expenseAccountId: li.expenseAccountId || null,
        description: li.description,
        quantity,
        unitPrice,
        discountPercent,
        taxPercent,
        amount: Math.round(amount * 10000) / 10000,
        sortOrder: li.sortOrder ?? index,
      };
    });
  }

  private calculateTotals(
    lineItems: any[],
    discountType?: string | null,
    discountValue?: number | null,
  ) {
    const subtotal = lineItems.reduce(
      (sum, li) =>
        sum +
        (li.quantity || Number(li.quantity)) *
          (li.unitPrice || Number(li.unitPrice)),
      0,
    );

    const lineTaxTotal = lineItems.reduce((sum, li) => {
      const q = li.quantity || Number(li.quantity);
      const up = li.unitPrice || Number(li.unitPrice);
      const dp = li.discountPercent || Number(li.discountPercent) || 0;
      const tp = li.taxPercent || Number(li.taxPercent) || 0;
      const lineSubtotal = q * up;
      const lineDiscount = lineSubtotal * (dp / 100);
      const afterDiscount = lineSubtotal - lineDiscount;
      return sum + afterDiscount * (tp / 100);
    }, 0);

    const lineDiscountTotal = lineItems.reduce((sum, li) => {
      const q = li.quantity || Number(li.quantity);
      const up = li.unitPrice || Number(li.unitPrice);
      const dp = li.discountPercent || Number(li.discountPercent) || 0;
      const lineSubtotal = q * up;
      return sum + lineSubtotal * (dp / 100);
    }, 0);

    let invoiceDiscountAmount = 0;
    if (discountType && discountValue) {
      if (discountType === 'PERCENTAGE') {
        invoiceDiscountAmount = subtotal * (discountValue / 100);
      } else {
        invoiceDiscountAmount = discountValue;
      }
    }

    const totalDiscountAmount = lineDiscountTotal + invoiceDiscountAmount;
    const taxAmount = lineTaxTotal;
    const totalAmount =
      Math.round((subtotal - totalDiscountAmount + taxAmount) * 10000) / 10000;

    return {
      subtotal,
      discountAmount: totalDiscountAmount,
      taxAmount,
      totalAmount,
    };
  }

  private getFullInclude() {
    return {
      vendor: {
        select: {
          id: true,
          displayName: true,
          email: true,
          phone: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
        },
      },
      lineItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              type: true,
            },
          },
          expenseAccount: {
            select: { id: true, name: true, accountNumber: true },
          },
        },
        orderBy: { sortOrder: 'asc' as const },
      },
      convertedBill: {
        select: {
          id: true,
          billNumber: true,
          status: true,
          totalAmount: true,
        },
      },
    };
  }

  private formatPurchaseOrder(po: any) {
    return {
      id: po.id,
      poNumber: po.poNumber,
      referenceNumber: po.referenceNumber,
      status: po.status,
      statusInfo:
        PURCHASE_ORDER_STATUS_INFO[
          po.status as keyof typeof PURCHASE_ORDER_STATUS_INFO
        ],
      poDate: po.poDate,
      expectedDeliveryDate: po.expectedDeliveryDate,
      paymentTerms: po.paymentTerms,
      vendor: po.vendor,
      lineItems: po.lineItems.map((li: any) => ({
        id: li.id,
        product: li.product,
        expenseAccount: li.expenseAccount,
        description: li.description,
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
        discountPercent: Number(li.discountPercent),
        taxPercent: Number(li.taxPercent),
        amount: Number(li.amount),
        quantityReceived: Number(li.quantityReceived),
        sortOrder: li.sortOrder,
      })),
      subtotal: Number(po.subtotal),
      discountType: po.discountType,
      discountValue: po.discountValue ? Number(po.discountValue) : null,
      discountAmount: Number(po.discountAmount),
      taxAmount: Number(po.taxAmount),
      totalAmount: Number(po.totalAmount),
      shippingAddress: {
        line1: po.shippingAddressLine1,
        line2: po.shippingAddressLine2,
        city: po.shippingCity,
        state: po.shippingState,
        postalCode: po.shippingPostalCode,
        country: po.shippingCountry,
      },
      convertedBill: po.convertedBill || null,
      notes: po.notes,
      memo: po.memo,
      vendorMessage: po.vendorMessage,
      sentAt: po.sentAt,
      receivedAt: po.receivedAt,
      closedAt: po.closedAt,
      voidedAt: po.voidedAt,
      voidReason: po.voidReason,
      createdAt: po.createdAt,
      updatedAt: po.updatedAt,
    };
  }

  private formatPurchaseOrderListItem(po: any) {
    return {
      id: po.id,
      poNumber: po.poNumber,
      referenceNumber: po.referenceNumber,
      status: po.status,
      statusInfo:
        PURCHASE_ORDER_STATUS_INFO[
          po.status as keyof typeof PURCHASE_ORDER_STATUS_INFO
        ],
      poDate: po.poDate,
      expectedDeliveryDate: po.expectedDeliveryDate,
      vendor: po.vendor,
      totalAmount: Number(po.totalAmount),
      lineItemCount: po._count?.lineItems || 0,
      createdAt: po.createdAt,
    };
  }
}
