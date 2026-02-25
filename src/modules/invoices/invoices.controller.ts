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
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@Controller('invoices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // Static routes MUST be before :id param route
  @Get('summary')
  @RequirePermissions('invoice:view')
  async getSummary(@CurrentUser() user: any): Promise<ApiResponseDto> {
    const summary = await this.invoicesService.getSummary(user.companyId);
    return {
      success: true,
      message: 'Invoice summary retrieved successfully',
      data: summary,
    };
  }

  @Get('next-number')
  @RequirePermissions('invoice:create')
  async getNextNumber(@CurrentUser() user: any): Promise<ApiResponseDto> {
    const nextNumber = await this.invoicesService.getNextInvoiceNumber(
      user.companyId,
    );
    return {
      success: true,
      message: 'Next invoice number retrieved successfully',
      data: { nextInvoiceNumber: nextNumber },
    };
  }

  @Get('statuses')
  @RequirePermissions('invoice:view')
  async getStatuses(): Promise<ApiResponseDto> {
    const statuses = await this.invoicesService.getInvoiceStatuses();
    return {
      success: true,
      message: 'Invoice statuses retrieved successfully',
      data: statuses,
    };
  }

  @Get()
  @RequirePermissions('invoice:view')
  async findAll(
    @Query() query: QueryInvoicesDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const result = await this.invoicesService.findAll(user.companyId, query);
    return {
      success: true,
      message: 'Invoices retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @RequirePermissions('invoice:view')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const invoice = await this.invoicesService.findOne(id, user.companyId);
    return {
      success: true,
      message: 'Invoice retrieved successfully',
      data: invoice,
    };
  }

  @Post()
  @RequirePermissions('invoice:create')
  async create(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const invoice = await this.invoicesService.create(dto, user.companyId);
    return {
      success: true,
      message: `Invoice ${invoice.invoiceNumber} created successfully`,
      data: invoice,
    };
  }

  @Patch(':id')
  @RequirePermissions('invoice:edit')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const invoice = await this.invoicesService.update(
      id,
      dto,
      user.companyId,
    );
    return {
      success: true,
      message: `Invoice ${invoice.invoiceNumber} updated successfully`,
      data: invoice,
    };
  }

  @Delete(':id')
  @RequirePermissions('invoice:delete')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const result = await this.invoicesService.delete(id, user.companyId);
    return {
      success: true,
      message: result.message,
      data: null,
    };
  }

  @Post(':id/send')
  @RequirePermissions('invoice:send')
  async send(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const invoice = await this.invoicesService.send(id, user.companyId, user.id);
    return {
      success: true,
      message: `Invoice ${invoice.invoiceNumber} has been sent`,
      data: invoice,
    };
  }

  @Post(':id/void')
  @RequirePermissions('invoice:void')
  async voidInvoice(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const invoice = await this.invoicesService.voidInvoice(
      id,
      user.companyId,
      user.id,
      body?.reason,
    );
    return {
      success: true,
      message: `Invoice ${invoice.invoiceNumber} has been voided`,
      data: invoice,
    };
  }

  @Post(':id/payments')
  @RequirePermissions('invoice:edit')
  async recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const invoice = await this.invoicesService.recordPayment(
      id,
      dto,
      user.companyId,
      user.id,
    );
    return {
      success: true,
      message: 'Payment recorded successfully',
      data: invoice,
    };
  }
}
