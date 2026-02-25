import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('expenses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // =====================================================================
  // STATIC ROUTES (before :id to avoid param conflicts)
  // =====================================================================

  @Get('summary')
  @RequirePermissions('expense:view')
  async getSummary(@CurrentUser() user: any) {
    const data = await this.expensesService.getSummary(user.companyId);
    return {
      success: true,
      message: 'Expense summary retrieved successfully',
      data,
    };
  }

  @Get('next-number')
  @RequirePermissions('expense:create')
  async getNextNumber(@CurrentUser() user: any) {
    const nextExpenseNumber = await this.expensesService.getNextExpenseNumber(
      user.companyId,
    );
    return {
      success: true,
      message: 'Next expense number retrieved successfully',
      data: { nextExpenseNumber },
    };
  }

  @Get('statuses')
  @RequirePermissions('expense:view')
  async getStatuses() {
    const data = this.expensesService.getExpenseStatuses();
    return {
      success: true,
      message: 'Expense statuses retrieved successfully',
      data,
    };
  }

  @Get('recurring-frequencies')
  @RequirePermissions('expense:view')
  async getRecurringFrequencies() {
    const data = this.expensesService.getRecurringFrequencies();
    return {
      success: true,
      message: 'Recurring frequencies retrieved successfully',
      data,
    };
  }

  // =====================================================================
  // STANDARD CRUD
  // =====================================================================

  @Get()
  @RequirePermissions('expense:view')
  async findAll(@CurrentUser() user: any, @Query() query: QueryExpensesDto) {
    const data = await this.expensesService.findAll(user.companyId, query);
    return {
      success: true,
      message: 'Expenses retrieved successfully',
      data,
    };
  }

  @Get(':id')
  @RequirePermissions('expense:view')
  async findOne(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.expensesService.findOne(id, user.companyId);
    return {
      success: true,
      message: 'Expense retrieved successfully',
      data,
    };
  }

  @Post()
  @RequirePermissions('expense:create')
  async create(@CurrentUser() user: any, @Body() dto: CreateExpenseDto) {
    const data = await this.expensesService.create(
      dto,
      user.companyId,
      user.id,
    );
    return {
      success: true,
      message: `Expense ${data.expenseNumber} created successfully`,
      data,
    };
  }

  @Patch(':id')
  @RequirePermissions('expense:edit')
  async update(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    const data = await this.expensesService.update(id, dto, user.companyId);
    return {
      success: true,
      message: `Expense ${data.expenseNumber} updated successfully`,
      data,
    };
  }

  @Delete(':id')
  @RequirePermissions('expense:delete')
  async delete(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.expensesService.delete(id, user.companyId);
    return {
      success: true,
      message: result.message,
      data: null,
    };
  }

  // =====================================================================
  // LIFECYCLE ACTIONS
  // =====================================================================

  @Post(':id/submit')
  @RequirePermissions('expense:edit')
  async submit(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.expensesService.submit(id, user.companyId);
    return {
      success: true,
      message: `Expense ${data.expenseNumber} submitted for approval`,
      data,
    };
  }

  @Post(':id/approve')
  @RequirePermissions('expense:approve')
  async approve(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.expensesService.approve(
      id,
      user.companyId,
      user.id,
    );
    return {
      success: true,
      message: `Expense ${data.expenseNumber} has been approved`,
      data,
    };
  }

  @Post(':id/reject')
  @RequirePermissions('expense:approve')
  async reject(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
  ) {
    const data = await this.expensesService.reject(
      id,
      user.companyId,
      body?.reason,
    );
    return {
      success: true,
      message: `Expense ${data.expenseNumber} has been rejected`,
      data,
    };
  }

  @Post(':id/mark-paid')
  @RequirePermissions('expense:edit')
  async markAsPaid(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { paymentMethod?: string; paymentAccountId?: string },
  ) {
    const data = await this.expensesService.markAsPaid(
      id,
      user.companyId,
      user.id,
      body,
    );
    const verb = data.status === 'REIMBURSED' ? 'reimbursed' : 'paid';
    return {
      success: true,
      message: `Expense ${data.expenseNumber} has been marked as ${verb}`,
      data,
    };
  }

  @Post(':id/void')
  @RequirePermissions('expense:void')
  async voidExpense(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
  ) {
    const data = await this.expensesService.voidExpense(
      id,
      user.companyId,
      body?.reason,
    );
    return {
      success: true,
      message: `Expense ${data.expenseNumber} has been voided`,
      data,
    };
  }
}
