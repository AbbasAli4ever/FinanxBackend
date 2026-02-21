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
} from '@nestjs/common';
import { BillsService } from './bills.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { QueryBillsDto } from './dto/query-bills.dto';
import { RecordBillPaymentDto } from './dto/record-bill-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@Controller('bills')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  // Static routes MUST be before :id param route
  @Get('summary')
  @RequirePermissions('bill:view')
  async getSummary(@CurrentUser() user: any): Promise<ApiResponseDto> {
    const summary = await this.billsService.getSummary(user.companyId);
    return {
      success: true,
      message: 'Bill summary retrieved successfully',
      data: summary,
    };
  }

  @Get('next-number')
  @RequirePermissions('bill:create')
  async getNextNumber(@CurrentUser() user: any): Promise<ApiResponseDto> {
    const nextNumber = await this.billsService.getNextBillNumber(
      user.companyId,
    );
    return {
      success: true,
      message: 'Next bill number retrieved successfully',
      data: { nextBillNumber: nextNumber },
    };
  }

  @Get('statuses')
  @RequirePermissions('bill:view')
  async getStatuses(): Promise<ApiResponseDto> {
    const statuses = await this.billsService.getBillStatuses();
    return {
      success: true,
      message: 'Bill statuses retrieved successfully',
      data: statuses,
    };
  }

  @Get()
  @RequirePermissions('bill:view')
  async findAll(
    @Query() query: QueryBillsDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const result = await this.billsService.findAll(user.companyId, query);
    return {
      success: true,
      message: 'Bills retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @RequirePermissions('bill:view')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const bill = await this.billsService.findOne(id, user.companyId);
    return {
      success: true,
      message: 'Bill retrieved successfully',
      data: bill,
    };
  }

  @Post()
  @RequirePermissions('bill:create')
  async create(
    @Body() dto: CreateBillDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const bill = await this.billsService.create(dto, user.companyId);
    return {
      success: true,
      message: `Bill ${bill.billNumber} created successfully`,
      data: bill,
    };
  }

  @Patch(':id')
  @RequirePermissions('bill:edit')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBillDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const bill = await this.billsService.update(id, dto, user.companyId);
    return {
      success: true,
      message: `Bill ${bill.billNumber} updated successfully`,
      data: bill,
    };
  }

  @Delete(':id')
  @RequirePermissions('bill:delete')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const result = await this.billsService.delete(id, user.companyId);
    return {
      success: true,
      message: result.message,
      data: null,
    };
  }

  @Post(':id/receive')
  @RequirePermissions('bill:edit')
  async receive(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const bill = await this.billsService.receive(id, user.companyId);
    return {
      success: true,
      message: `Bill ${bill.billNumber} has been received`,
      data: bill,
    };
  }

  @Post(':id/void')
  @RequirePermissions('bill:void')
  async voidBill(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const bill = await this.billsService.voidBill(
      id,
      user.companyId,
      body?.reason,
    );
    return {
      success: true,
      message: `Bill ${bill.billNumber} has been voided`,
      data: bill,
    };
  }

  @Post(':id/payments')
  @RequirePermissions('bill:pay')
  async recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordBillPaymentDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const bill = await this.billsService.recordPayment(
      id,
      dto,
      user.companyId,
    );
    return {
      success: true,
      message: 'Payment recorded successfully',
      data: bill,
    };
  }
}
