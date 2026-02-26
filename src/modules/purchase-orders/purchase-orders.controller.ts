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
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { QueryPurchaseOrdersDto } from './dto/query-purchase-orders.dto';
import { ReceiveItemsDto } from './dto/receive-items.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchaseOrdersController {
  constructor(
    private readonly purchaseOrdersService: PurchaseOrdersService,
  ) {}

  // Static routes MUST be before :id param routes
  @Get('summary')
  @RequirePermissions('purchase-order:view')
  async getSummary(@CurrentUser() user: any): Promise<ApiResponseDto> {
    const summary = await this.purchaseOrdersService.getSummary(
      user.companyId,
    );
    return {
      success: true,
      message: 'Purchase order summary retrieved successfully',
      data: summary,
    };
  }

  @Get('next-number')
  @RequirePermissions('purchase-order:create')
  async getNextNumber(@CurrentUser() user: any): Promise<ApiResponseDto> {
    const nextNumber = await this.purchaseOrdersService.getNextPONumber(
      user.companyId,
    );
    return {
      success: true,
      message: 'Next PO number retrieved successfully',
      data: { nextPONumber: nextNumber },
    };
  }

  @Get('statuses')
  @RequirePermissions('purchase-order:view')
  async getStatuses(): Promise<ApiResponseDto> {
    const statuses = this.purchaseOrdersService.getStatuses();
    return {
      success: true,
      message: 'Purchase order statuses retrieved successfully',
      data: statuses,
    };
  }

  @Get()
  @RequirePermissions('purchase-order:view')
  async findAll(
    @Query() query: QueryPurchaseOrdersDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const result = await this.purchaseOrdersService.findAll(
      user.companyId,
      query,
    );
    return {
      success: true,
      message: 'Purchase orders retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @RequirePermissions('purchase-order:view')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const po = await this.purchaseOrdersService.findOne(id, user.companyId);
    return {
      success: true,
      message: 'Purchase order retrieved successfully',
      data: po,
    };
  }

  @Post()
  @RequirePermissions('purchase-order:create')
  async create(
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const po = await this.purchaseOrdersService.create(dto, user.companyId);
    return {
      success: true,
      message: `Purchase order ${po.poNumber} created successfully`,
      data: po,
    };
  }

  @Patch(':id')
  @RequirePermissions('purchase-order:edit')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const po = await this.purchaseOrdersService.update(
      id,
      dto,
      user.companyId,
    );
    return {
      success: true,
      message: `Purchase order ${po.poNumber} updated successfully`,
      data: po,
    };
  }

  @Delete(':id')
  @RequirePermissions('purchase-order:delete')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const result = await this.purchaseOrdersService.delete(id, user.companyId);
    return {
      success: true,
      message: result.message,
      data: null,
    };
  }

  @Post(':id/send')
  @RequirePermissions('purchase-order:send')
  async send(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const po = await this.purchaseOrdersService.send(id, user.companyId);
    return {
      success: true,
      message: `Purchase order ${po.poNumber} has been sent`,
      data: po,
    };
  }

  @Post(':id/receive')
  @RequirePermissions('purchase-order:receive')
  async receive(
    @Param('id') id: string,
    @Body() dto: ReceiveItemsDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const po = await this.purchaseOrdersService.receive(
      id,
      user.companyId,
      dto,
    );
    return {
      success: true,
      message: `Items received for purchase order ${po.poNumber}`,
      data: po,
    };
  }

  @Post(':id/convert-to-bill')
  @RequirePermissions('purchase-order:convert')
  async convertToBill(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const result = await this.purchaseOrdersService.convertToBill(
      id,
      user.companyId,
    );
    return {
      success: true,
      message: `Purchase order ${result.poNumber} converted to bill ${result.convertedBill?.billNumber || ''}`,
      data: result,
    };
  }

  @Post(':id/duplicate')
  @RequirePermissions('purchase-order:create')
  async duplicate(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const po = await this.purchaseOrdersService.duplicate(
      id,
      user.companyId,
    );
    return {
      success: true,
      message: `Purchase order duplicated as ${po.poNumber}`,
      data: po,
    };
  }

  @Post(':id/close')
  @RequirePermissions('purchase-order:edit')
  async close(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const po = await this.purchaseOrdersService.close(id, user.companyId);
    return {
      success: true,
      message: `Purchase order ${po.poNumber} has been closed`,
      data: po,
    };
  }

  @Post(':id/void')
  @RequirePermissions('purchase-order:void')
  async voidPO(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const po = await this.purchaseOrdersService.voidPO(
      id,
      user.companyId,
      body?.reason,
    );
    return {
      success: true,
      message: `Purchase order ${po.poNumber} has been voided`,
      data: po,
    };
  }
}
