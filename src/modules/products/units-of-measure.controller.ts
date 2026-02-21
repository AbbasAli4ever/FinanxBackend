import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { UnitsOfMeasureService } from './units-of-measure.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

class CreateUnitOfMeasureDto {
  @IsNotEmpty({ message: 'Unit name is required (e.g. Kilogram, Hour, Box)' })
  @IsString({ message: 'Unit name must be a text value' })
  @MaxLength(100, { message: 'Unit name cannot exceed 100 characters' })
  name: string;

  @IsNotEmpty({ message: 'Abbreviation is required (e.g. kg, hr, box)' })
  @IsString({ message: 'Abbreviation must be a text value' })
  @MaxLength(20, { message: 'Abbreviation cannot exceed 20 characters' })
  abbreviation: string;
}

class UpdateUnitOfMeasureDto {
  @IsOptional()
  @IsString({ message: 'Unit name must be a text value' })
  @MaxLength(100, { message: 'Unit name cannot exceed 100 characters' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Abbreviation must be a text value' })
  @MaxLength(20, { message: 'Abbreviation cannot exceed 20 characters' })
  abbreviation?: string;
}

@Controller('units-of-measure')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UnitsOfMeasureController {
  constructor(private readonly uomService: UnitsOfMeasureService) {}

  @Get()
  @RequirePermissions('product:view')
  async findAll(@CurrentUser() user: any): Promise<ApiResponseDto> {
    const units = await this.uomService.findAll(user.companyId);
    return {
      success: true,
      message: 'Units of measure retrieved successfully',
      data: units,
    };
  }

  @Post()
  @RequirePermissions('product:create')
  async create(
    @Body() dto: CreateUnitOfMeasureDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const unit = await this.uomService.create(dto, user.companyId);
    return {
      success: true,
      message: 'Unit of measure created successfully',
      data: unit,
    };
  }

  @Patch(':id')
  @RequirePermissions('product:edit')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUnitOfMeasureDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const unit = await this.uomService.update(id, dto, user.companyId);
    return {
      success: true,
      message: 'Unit of measure updated successfully',
      data: unit,
    };
  }

  @Delete(':id')
  @RequirePermissions('product:delete')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const result = await this.uomService.delete(id, user.companyId);
    return {
      success: true,
      message: result.message,
      data: null,
    };
  }
}
