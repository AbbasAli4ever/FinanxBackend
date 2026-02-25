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
import { EstimatesService } from './estimates.service';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { UpdateEstimateDto } from './dto/update-estimate.dto';
import { QueryEstimatesDto } from './dto/query-estimates.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@Controller('estimates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EstimatesController {
  constructor(private readonly estimatesService: EstimatesService) {}

  // Static routes MUST be before :id param routes
  @Get('summary')
  @RequirePermissions('estimate:view')
  async getSummary(@CurrentUser() user: any): Promise<ApiResponseDto> {
    const summary = await this.estimatesService.getSummary(user.companyId);
    return {
      success: true,
      message: 'Estimate summary retrieved successfully',
      data: summary,
    };
  }

  @Get('next-number')
  @RequirePermissions('estimate:create')
  async getNextNumber(@CurrentUser() user: any): Promise<ApiResponseDto> {
    const nextNumber = await this.estimatesService.getNextEstimateNumber(
      user.companyId,
    );
    return {
      success: true,
      message: 'Next estimate number retrieved successfully',
      data: { nextEstimateNumber: nextNumber },
    };
  }

  @Get('statuses')
  @RequirePermissions('estimate:view')
  async getStatuses(): Promise<ApiResponseDto> {
    const statuses = await this.estimatesService.getEstimateStatuses();
    return {
      success: true,
      message: 'Estimate statuses retrieved successfully',
      data: statuses,
    };
  }

  @Get()
  @RequirePermissions('estimate:view')
  async findAll(
    @Query() query: QueryEstimatesDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const result = await this.estimatesService.findAll(
      user.companyId,
      query,
    );
    return {
      success: true,
      message: 'Estimates retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @RequirePermissions('estimate:view')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const estimate = await this.estimatesService.findOne(id, user.companyId);
    return {
      success: true,
      message: 'Estimate retrieved successfully',
      data: estimate,
    };
  }

  @Post()
  @RequirePermissions('estimate:create')
  async create(
    @Body() dto: CreateEstimateDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const estimate = await this.estimatesService.create(dto, user.companyId);
    return {
      success: true,
      message: `Estimate ${estimate.estimateNumber} created successfully`,
      data: estimate,
    };
  }

  @Patch(':id')
  @RequirePermissions('estimate:edit')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEstimateDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const estimate = await this.estimatesService.update(
      id,
      dto,
      user.companyId,
    );
    return {
      success: true,
      message: `Estimate ${estimate.estimateNumber} updated successfully`,
      data: estimate,
    };
  }

  @Delete(':id')
  @RequirePermissions('estimate:delete')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const result = await this.estimatesService.delete(id, user.companyId);
    return {
      success: true,
      message: result.message,
      data: null,
    };
  }

  @Post(':id/send')
  @RequirePermissions('estimate:send')
  async send(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const estimate = await this.estimatesService.send(id, user.companyId);
    return {
      success: true,
      message: `Estimate ${estimate.estimateNumber} has been sent`,
      data: estimate,
    };
  }

  @Post(':id/mark-viewed')
  @RequirePermissions('estimate:edit')
  async markViewed(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const estimate = await this.estimatesService.markViewed(
      id,
      user.companyId,
    );
    return {
      success: true,
      message: `Estimate ${estimate.estimateNumber} marked as viewed`,
      data: estimate,
    };
  }

  @Post(':id/accept')
  @RequirePermissions('estimate:edit')
  async accept(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const estimate = await this.estimatesService.accept(id, user.companyId);
    return {
      success: true,
      message: `Estimate ${estimate.estimateNumber} has been accepted`,
      data: estimate,
    };
  }

  @Post(':id/reject')
  @RequirePermissions('estimate:edit')
  async reject(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const estimate = await this.estimatesService.reject(
      id,
      user.companyId,
      body?.reason,
    );
    return {
      success: true,
      message: `Estimate ${estimate.estimateNumber} has been rejected`,
      data: estimate,
    };
  }

  @Post(':id/convert-to-invoice')
  @RequirePermissions('estimate:convert')
  async convertToInvoice(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const result = await this.estimatesService.convertToInvoice(
      id,
      user.companyId,
    );
    return {
      success: true,
      message: `Estimate ${result.estimateNumber} converted to invoice ${result.convertedInvoice?.invoiceNumber || ''}`,
      data: result,
    };
  }

  @Post(':id/duplicate')
  @RequirePermissions('estimate:create')
  async duplicate(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const estimate = await this.estimatesService.duplicate(
      id,
      user.companyId,
    );
    return {
      success: true,
      message: `Estimate duplicated as ${estimate.estimateNumber}`,
      data: estimate,
    };
  }

  @Post(':id/void')
  @RequirePermissions('estimate:void')
  async voidEstimate(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const estimate = await this.estimatesService.voidEstimate(
      id,
      user.companyId,
      body?.reason,
    );
    return {
      success: true,
      message: `Estimate ${estimate.estimateNumber} has been voided`,
      data: estimate,
    };
  }

  @Post('expire-overdue')
  @RequirePermissions('estimate:edit')
  async expireOverdue(@CurrentUser() user: any): Promise<ApiResponseDto> {
    const result = await this.estimatesService.expireOverdue(user.companyId);
    return {
      success: true,
      message: result.message,
      data: result,
    };
  }
}
