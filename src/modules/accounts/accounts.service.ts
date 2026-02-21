import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { QueryAccountsDto } from './dto/query-accounts.dto';
import {
  AccountType,
  ACCOUNT_TYPE_INFO,
  DETAIL_TYPES,
  NormalBalance,
  AccountTypeGroup,
  isValidDetailType,
  getNormalBalance,
  getAccountTypesByGroup,
} from './constants/account-types.constant';
import { DEFAULT_ACCOUNTS } from './constants/default-accounts.constant';
import { Prisma } from '@prisma/client';

const MAX_HIERARCHY_DEPTH = 4;

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(private prisma: PrismaService) {}

  // ===========================================================================
  // CREATE ACCOUNT
  // ===========================================================================
  async create(createAccountDto: CreateAccountDto, companyId: string) {
    // Validate account type
    const accountTypeInfo = ACCOUNT_TYPE_INFO[createAccountDto.accountType as AccountType];
    if (!accountTypeInfo) {
      throw new BadRequestException(
        `Invalid account type: "${createAccountDto.accountType}". Valid types: ${Object.values(AccountType).join(', ')}`,
      );
    }

    // Validate detail type
    if (!isValidDetailType(createAccountDto.accountType as AccountType, createAccountDto.detailType)) {
      const validTypes = DETAIL_TYPES[createAccountDto.accountType as AccountType] || [];
      throw new BadRequestException(
        `Invalid detail type "${createAccountDto.detailType}" for account type "${createAccountDto.accountType}". Valid types: ${validTypes.join(', ')}`,
      );
    }

    // Check duplicate account number
    if (createAccountDto.accountNumber) {
      const existingNumber = await this.prisma.account.findFirst({
        where: {
          companyId,
          accountNumber: createAccountDto.accountNumber,
        },
      });
      if (existingNumber) {
        throw new ConflictException(
          `Account number "${createAccountDto.accountNumber}" already exists`,
        );
      }
    }

    // Handle parent account / sub-account logic
    let depth = 0;
    let fullPath = '';
    let hasParent = false;

    if (createAccountDto.parentAccountId) {
      const parentAccount = await this.prisma.account.findFirst({
        where: {
          id: createAccountDto.parentAccountId,
          companyId,
        },
      });

      if (!parentAccount) {
        throw new NotFoundException('Parent account not found');
      }

      hasParent = true;

      // Validate parent is same account type
      if (parentAccount.accountType !== createAccountDto.accountType) {
        throw new BadRequestException(
          `Sub-account must be the same account type as parent. Parent is "${parentAccount.accountType}"`,
        );
      }

      // Check max depth
      depth = parentAccount.depth + 1;
      if (depth >= MAX_HIERARCHY_DEPTH) {
        throw new BadRequestException(
          `Maximum account hierarchy depth of ${MAX_HIERARCHY_DEPTH} levels exceeded`,
        );
      }

      fullPath = parentAccount.fullPath
        ? `${parentAccount.fullPath} > ${createAccountDto.name}`
        : `${parentAccount.name} > ${createAccountDto.name}`;
    } else {
      fullPath = createAccountDto.name;
    }

    // Check duplicate name under same parent
    const existingName = await this.prisma.account.findFirst({
      where: {
        companyId,
        name: createAccountDto.name,
        parentAccountId: createAccountDto.parentAccountId || null,
      },
    });
    if (existingName) {
      throw new ConflictException(
        `Account name "${createAccountDto.name}" already exists${hasParent ? ' under this parent account' : ''}`,
      );
    }

    // Get normal balance from account type
    const normalBalance = getNormalBalance(createAccountDto.accountType as AccountType);

    // Determine display order
    const lastAccount = await this.prisma.account.findFirst({
      where: { companyId },
      orderBy: { displayOrder: 'desc' },
    });
    const displayOrder = lastAccount ? lastAccount.displayOrder + 1 : 0;

    const account = await this.prisma.account.create({
      data: {
        companyId,
        accountNumber: createAccountDto.accountNumber || null,
        name: createAccountDto.name,
        description: createAccountDto.description || null,
        accountType: createAccountDto.accountType,
        detailType: createAccountDto.detailType,
        normalBalance,
        parentAccountId: createAccountDto.parentAccountId || null,
        isSubAccount: !!createAccountDto.parentAccountId || createAccountDto.isSubAccount || false,
        depth,
        fullPath,
        displayOrder,
      },
      include: {
        parentAccount: {
          select: { id: true, name: true, accountNumber: true },
        },
      },
    });

    return this.formatAccount(account);
  }

  // ===========================================================================
  // GET ALL ACCOUNTS (with filtering)
  // ===========================================================================
  async findAll(companyId: string, query: QueryAccountsDto) {
    const where: Prisma.AccountWhereInput = { companyId };

    if (query.accountType) {
      where.accountType = query.accountType;
    }
    if (query.detailType) {
      where.detailType = query.detailType;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    if (query.isSubAccount !== undefined) {
      where.isSubAccount = query.isSubAccount;
    }
    if (query.parentAccountId) {
      where.parentAccountId = query.parentAccountId;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { accountNumber: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Sorting
    const orderBy: Prisma.AccountOrderByWithRelationInput[] = [];
    if (query.sortBy) {
      orderBy.push({ [query.sortBy]: query.sortOrder || 'asc' });
    } else {
      orderBy.push({ accountType: 'asc' }, { displayOrder: 'asc' }, { accountNumber: 'asc' });
    }

    const accounts = await this.prisma.account.findMany({
      where,
      orderBy,
      include: {
        parentAccount: {
          select: { id: true, name: true, accountNumber: true },
        },
        _count: {
          select: { subAccounts: true },
        },
      },
    });

    return accounts.map((account) => this.formatAccountWithCount(account));
  }

  // ===========================================================================
  // GET SINGLE ACCOUNT
  // ===========================================================================
  async findOne(accountId: string, companyId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, companyId },
      include: {
        parentAccount: {
          select: { id: true, name: true, accountNumber: true },
        },
        subAccounts: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          select: {
            id: true,
            accountNumber: true,
            name: true,
            accountType: true,
            detailType: true,
            currentBalance: true,
            isActive: true,
          },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return {
      ...this.formatAccount(account),
      subAccounts: account.subAccounts.map((sub) => ({
        id: sub.id,
        accountNumber: sub.accountNumber,
        name: sub.name,
        accountType: sub.accountType,
        detailType: sub.detailType,
        currentBalance: Number(sub.currentBalance),
        isActive: sub.isActive,
      })),
    };
  }

  // ===========================================================================
  // UPDATE ACCOUNT
  // ===========================================================================
  async update(accountId: string, updateAccountDto: UpdateAccountDto, companyId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, companyId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // If updating account number, check uniqueness
    if (updateAccountDto.accountNumber && updateAccountDto.accountNumber !== account.accountNumber) {
      const existing = await this.prisma.account.findFirst({
        where: {
          companyId,
          accountNumber: updateAccountDto.accountNumber,
          NOT: { id: accountId },
        },
      });
      if (existing) {
        throw new ConflictException(
          `Account number "${updateAccountDto.accountNumber}" already exists`,
        );
      }
    }

    // If updating name, check uniqueness under same parent
    if (updateAccountDto.name && updateAccountDto.name !== account.name) {
      const existing = await this.prisma.account.findFirst({
        where: {
          companyId,
          name: updateAccountDto.name,
          parentAccountId: account.parentAccountId,
          NOT: { id: accountId },
        },
      });
      if (existing) {
        throw new ConflictException(
          `Account name "${updateAccountDto.name}" already exists`,
        );
      }
    }

    // If updating detail type, validate against account type
    if (updateAccountDto.detailType) {
      if (!isValidDetailType(account.accountType as AccountType, updateAccountDto.detailType)) {
        const validTypes = DETAIL_TYPES[account.accountType as AccountType] || [];
        throw new BadRequestException(
          `Invalid detail type "${updateAccountDto.detailType}" for account type "${account.accountType}". Valid types: ${validTypes.join(', ')}`,
        );
      }
    }

    // Build update data
    const updateData: Prisma.AccountUpdateInput = {};
    if (updateAccountDto.accountNumber !== undefined) updateData.accountNumber = updateAccountDto.accountNumber;
    if (updateAccountDto.name !== undefined) {
      updateData.name = updateAccountDto.name;
      // Update fullPath
      if (account.parentAccountId) {
        const parent = await this.prisma.account.findUnique({
          where: { id: account.parentAccountId },
        });
        updateData.fullPath = parent?.fullPath
          ? `${parent.fullPath} > ${updateAccountDto.name}`
          : `${parent?.name} > ${updateAccountDto.name}`;
      } else {
        updateData.fullPath = updateAccountDto.name;
      }
    }
    if (updateAccountDto.description !== undefined) updateData.description = updateAccountDto.description;
    if (updateAccountDto.detailType !== undefined) updateData.detailType = updateAccountDto.detailType;
    if (updateAccountDto.isActive !== undefined) updateData.isActive = updateAccountDto.isActive;

    const updated = await this.prisma.account.update({
      where: { id: accountId },
      data: updateData,
      include: {
        parentAccount: {
          select: { id: true, name: true, accountNumber: true },
        },
      },
    });

    // If name was updated, update fullPath of all child accounts
    if (updateAccountDto.name) {
      await this.updateChildPaths(accountId, companyId);
    }

    return this.formatAccount(updated);
  }

  // ===========================================================================
  // DELETE ACCOUNT
  // ===========================================================================
  async delete(accountId: string, companyId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, companyId },
      include: {
        _count: {
          select: { subAccounts: true },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Prevent deleting system accounts
    if (account.isSystemAccount) {
      throw new BadRequestException('System accounts cannot be deleted');
    }

    // Prevent deleting accounts with sub-accounts
    if (account._count.subAccounts > 0) {
      throw new BadRequestException(
        `Cannot delete account with ${account._count.subAccounts} sub-account(s). Delete sub-accounts first.`,
      );
    }

    // Prevent deleting accounts with balance
    if (Number(account.currentBalance) !== 0) {
      throw new BadRequestException(
        'Cannot delete account with a non-zero balance. Transfer the balance first.',
      );
    }

    await this.prisma.account.delete({
      where: { id: accountId },
    });

    return { message: 'Account deleted successfully' };
  }

  // ===========================================================================
  // GET ACCOUNT TREE (hierarchical view)
  // ===========================================================================
  async getAccountTree(companyId: string, accountType?: string) {
    const where: Prisma.AccountWhereInput = {
      companyId,
      isActive: true,
      parentAccountId: null, // Only root accounts
    };

    if (accountType) {
      where.accountType = accountType;
    }

    const rootAccounts = await this.prisma.account.findMany({
      where,
      orderBy: [{ accountType: 'asc' }, { displayOrder: 'asc' }, { accountNumber: 'asc' }],
      include: {
        subAccounts: {
          where: { isActive: true },
          orderBy: [{ displayOrder: 'asc' }, { accountNumber: 'asc' }],
          include: {
            subAccounts: {
              where: { isActive: true },
              orderBy: [{ displayOrder: 'asc' }, { accountNumber: 'asc' }],
              include: {
                subAccounts: {
                  where: { isActive: true },
                  orderBy: [{ displayOrder: 'asc' }, { accountNumber: 'asc' }],
                },
              },
            },
          },
        },
      },
    });

    // Group by account type group
    const grouped: Record<string, any[]> = {};

    for (const account of rootAccounts) {
      const typeInfo = ACCOUNT_TYPE_INFO[account.accountType as AccountType];
      const group = typeInfo?.group || 'Other';

      if (!grouped[group]) {
        grouped[group] = [];
      }

      grouped[group].push(this.formatTreeNode(account));
    }

    return grouped;
  }

  // ===========================================================================
  // GET ACCOUNT TYPES & DETAIL TYPES (for frontend dropdowns)
  // ===========================================================================
  getAccountTypes() {
    const types = Object.values(AccountType).map((type) => {
      const info = ACCOUNT_TYPE_INFO[type];
      return {
        value: type,
        label: type,
        group: info.group,
        normalBalance: info.normalBalance,
        numberRange: `${info.numberRangeStart}-${info.numberRangeEnd}`,
        isBalanceSheet: info.isBalanceSheet,
        description: info.description,
        detailTypes: DETAIL_TYPES[type] || [],
      };
    });

    // Group by AccountTypeGroup
    const grouped: Record<string, any[]> = {};
    for (const type of types) {
      if (!grouped[type.group]) {
        grouped[type.group] = [];
      }
      grouped[type.group].push(type);
    }

    return {
      all: types,
      grouped,
      groups: Object.values(AccountTypeGroup),
    };
  }

  // ===========================================================================
  // SEED DEFAULT ACCOUNTS (called during company registration)
  // ===========================================================================
  async seedDefaultAccounts(companyId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;

    this.logger.log(`Seeding ${DEFAULT_ACCOUNTS.length} default accounts for company ${companyId}`);

    const accounts = DEFAULT_ACCOUNTS.map((def, index) => ({
      companyId,
      accountNumber: def.accountNumber,
      name: def.name,
      accountType: def.accountType,
      detailType: def.detailType,
      normalBalance: def.normalBalance,
      description: def.description,
      isSystemAccount: true,
      isSubAccount: false,
      depth: 0,
      fullPath: def.name,
      displayOrder: index,
    }));

    await client.account.createMany({ data: accounts });

    this.logger.log(`Successfully seeded ${accounts.length} default accounts`);
    return accounts.length;
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private formatAccount(account: any) {
    return {
      id: account.id,
      accountNumber: account.accountNumber,
      name: account.name,
      description: account.description,
      accountType: account.accountType,
      detailType: account.detailType,
      normalBalance: account.normalBalance,
      parentAccount: account.parentAccount || null,
      isSubAccount: account.isSubAccount,
      depth: account.depth,
      fullPath: account.fullPath,
      currentBalance: Number(account.currentBalance),
      isSystemAccount: account.isSystemAccount,
      isActive: account.isActive,
      displayOrder: account.displayOrder,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  private formatAccountWithCount(account: any) {
    return {
      ...this.formatAccount(account),
      subAccountsCount: account._count?.subAccounts || 0,
    };
  }

  private formatTreeNode(account: any): any {
    return {
      id: account.id,
      accountNumber: account.accountNumber,
      name: account.name,
      accountType: account.accountType,
      detailType: account.detailType,
      normalBalance: account.normalBalance,
      currentBalance: Number(account.currentBalance),
      isSystemAccount: account.isSystemAccount,
      depth: account.depth,
      children: account.subAccounts?.map((sub: any) => this.formatTreeNode(sub)) || [],
    };
  }

  private async updateChildPaths(parentId: string, companyId: string) {
    const parent = await this.prisma.account.findUnique({
      where: { id: parentId },
    });
    if (!parent) return;

    const children = await this.prisma.account.findMany({
      where: { parentAccountId: parentId, companyId },
    });

    for (const child of children) {
      const newPath = parent.fullPath
        ? `${parent.fullPath} > ${child.name}`
        : `${parent.name} > ${child.name}`;

      await this.prisma.account.update({
        where: { id: child.id },
        data: { fullPath: newPath },
      });

      // Recursively update grandchildren
      await this.updateChildPaths(child.id, companyId);
    }
  }
}