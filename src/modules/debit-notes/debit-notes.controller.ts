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
import { DebitNotesService } from './debit-notes.service';
import { CreateDebitNoteDto } from './dto/create-debit-note.dto';
import { UpdateDebitNoteDto } from './dto/update-debit-note.dto';
import { QueryDebitNotesDto } from './dto/query-debit-notes.dto';
import { ApplyDebitNoteDto } from './dto/apply-debit-note.dto';
import { RefundDebitNoteDto } from './dto/refund-debit-note.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@Controller('debit-notes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DebitNotesController {
  constructor(private readonly debitNotesService: DebitNotesService) {}

  // Static routes MUST be before :id param route
  @Get('summary')
  @RequirePermissions('debit-note:view')
  async getSummary(@CurrentUser() user: any): Promise<ApiResponseDto> {
    const summary = await this.debitNotesService.getSummary(user.companyId);
    return {
      success: true,
      message: 'Debit note summary retrieved successfully',
      data: summary,
    };
  }

  @Get('next-number')
  @RequirePermissions('debit-note:create')
  async getNextNumber(@CurrentUser() user: any): Promise<ApiResponseDto> {
    const nextNumber = await this.debitNotesService.getNextDebitNoteNumber(user.companyId);
    return {
      success: true,
      message: 'Next debit note number retrieved successfully',
      data: { nextDebitNoteNumber: nextNumber },
    };
  }

  @Get('statuses')
  @RequirePermissions('debit-note:view')
  async getStatuses(): Promise<ApiResponseDto> {
    const statuses = this.debitNotesService.getStatuses();
    return {
      success: true,
      message: 'Debit note statuses retrieved successfully',
      data: statuses,
    };
  }

  @Get()
  @RequirePermissions('debit-note:view')
  async findAll(
    @Query() query: QueryDebitNotesDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const result = await this.debitNotesService.findAll(user.companyId, query);
    return {
      success: true,
      message: 'Debit notes retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @RequirePermissions('debit-note:view')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const debitNote = await this.debitNotesService.findOne(id, user.companyId);
    return {
      success: true,
      message: 'Debit note retrieved successfully',
      data: debitNote,
    };
  }

  @Post()
  @RequirePermissions('debit-note:create')
  async create(
    @Body() dto: CreateDebitNoteDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const debitNote = await this.debitNotesService.create(dto, user.companyId);
    return {
      success: true,
      message: `Debit note ${debitNote.debitNoteNumber} created successfully`,
      data: debitNote,
    };
  }

  @Patch(':id')
  @RequirePermissions('debit-note:edit')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDebitNoteDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const debitNote = await this.debitNotesService.update(id, dto, user.companyId);
    return {
      success: true,
      message: `Debit note ${debitNote.debitNoteNumber} updated successfully`,
      data: debitNote,
    };
  }

  @Delete(':id')
  @RequirePermissions('debit-note:delete')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const result = await this.debitNotesService.delete(id, user.companyId);
    return {
      success: true,
      message: result.message,
      data: null,
    };
  }

  @Post(':id/open')
  @RequirePermissions('debit-note:edit')
  async open(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const debitNote = await this.debitNotesService.open(id, user.companyId, user.id);
    return {
      success: true,
      message: `Debit note ${debitNote.debitNoteNumber} has been opened`,
      data: debitNote,
    };
  }

  @Post(':id/apply')
  @RequirePermissions('debit-note:edit')
  async apply(
    @Param('id') id: string,
    @Body() dto: ApplyDebitNoteDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const debitNote = await this.debitNotesService.apply(id, dto, user.companyId, user.id);
    return {
      success: true,
      message: 'Debit note applied to bill(s) successfully',
      data: debitNote,
    };
  }

  @Post(':id/refund')
  @RequirePermissions('debit-note:edit')
  async refund(
    @Param('id') id: string,
    @Body() dto: RefundDebitNoteDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const debitNote = await this.debitNotesService.refund(id, dto, user.companyId, user.id);
    return {
      success: true,
      message: 'Vendor refund received successfully',
      data: debitNote,
    };
  }

  @Post(':id/void')
  @RequirePermissions('debit-note:delete')
  async voidDebitNote(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const debitNote = await this.debitNotesService.voidDebitNote(
      id,
      user.companyId,
      user.id,
      body?.reason,
    );
    return {
      success: true,
      message: `Debit note ${debitNote.debitNoteNumber} has been voided`,
      data: debitNote,
    };
  }
}
