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
import { CreditNotesService } from './credit-notes.service';
import { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import { UpdateCreditNoteDto } from './dto/update-credit-note.dto';
import { QueryCreditNotesDto } from './dto/query-credit-notes.dto';
import { ApplyCreditNoteDto } from './dto/apply-credit-note.dto';
import { RefundCreditNoteDto } from './dto/refund-credit-note.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@Controller('credit-notes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CreditNotesController {
  constructor(private readonly creditNotesService: CreditNotesService) {}

  // Static routes MUST be before :id param route
  @Get('summary')
  @RequirePermissions('credit-note:view')
  async getSummary(@CurrentUser() user: any): Promise<ApiResponseDto> {
    const summary = await this.creditNotesService.getSummary(user.companyId);
    return {
      success: true,
      message: 'Credit note summary retrieved successfully',
      data: summary,
    };
  }

  @Get('next-number')
  @RequirePermissions('credit-note:create')
  async getNextNumber(@CurrentUser() user: any): Promise<ApiResponseDto> {
    const nextNumber = await this.creditNotesService.getNextCreditNoteNumber(user.companyId);
    return {
      success: true,
      message: 'Next credit note number retrieved successfully',
      data: { nextCreditNoteNumber: nextNumber },
    };
  }

  @Get('statuses')
  @RequirePermissions('credit-note:view')
  async getStatuses(): Promise<ApiResponseDto> {
    const statuses = this.creditNotesService.getStatuses();
    return {
      success: true,
      message: 'Credit note statuses retrieved successfully',
      data: statuses,
    };
  }

  @Get()
  @RequirePermissions('credit-note:view')
  async findAll(
    @Query() query: QueryCreditNotesDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const result = await this.creditNotesService.findAll(user.companyId, query);
    return {
      success: true,
      message: 'Credit notes retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @RequirePermissions('credit-note:view')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const creditNote = await this.creditNotesService.findOne(id, user.companyId);
    return {
      success: true,
      message: 'Credit note retrieved successfully',
      data: creditNote,
    };
  }

  @Post()
  @RequirePermissions('credit-note:create')
  async create(
    @Body() dto: CreateCreditNoteDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const creditNote = await this.creditNotesService.create(dto, user.companyId);
    return {
      success: true,
      message: `Credit note ${creditNote.creditNoteNumber} created successfully`,
      data: creditNote,
    };
  }

  @Patch(':id')
  @RequirePermissions('credit-note:edit')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCreditNoteDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const creditNote = await this.creditNotesService.update(id, dto, user.companyId);
    return {
      success: true,
      message: `Credit note ${creditNote.creditNoteNumber} updated successfully`,
      data: creditNote,
    };
  }

  @Delete(':id')
  @RequirePermissions('credit-note:delete')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const result = await this.creditNotesService.delete(id, user.companyId);
    return {
      success: true,
      message: result.message,
      data: null,
    };
  }

  @Post(':id/open')
  @RequirePermissions('credit-note:edit')
  async open(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const creditNote = await this.creditNotesService.open(id, user.companyId, user.id);
    return {
      success: true,
      message: `Credit note ${creditNote.creditNoteNumber} has been opened`,
      data: creditNote,
    };
  }

  @Post(':id/apply')
  @RequirePermissions('credit-note:edit')
  async apply(
    @Param('id') id: string,
    @Body() dto: ApplyCreditNoteDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const creditNote = await this.creditNotesService.apply(id, dto, user.companyId, user.id);
    return {
      success: true,
      message: 'Credit note applied to invoice(s) successfully',
      data: creditNote,
    };
  }

  @Post(':id/refund')
  @RequirePermissions('credit-note:edit')
  async refund(
    @Param('id') id: string,
    @Body() dto: RefundCreditNoteDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const creditNote = await this.creditNotesService.refund(id, dto, user.companyId, user.id);
    return {
      success: true,
      message: 'Credit note refund processed successfully',
      data: creditNote,
    };
  }

  @Post(':id/void')
  @RequirePermissions('credit-note:delete')
  async voidCreditNote(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const creditNote = await this.creditNotesService.voidCreditNote(
      id,
      user.companyId,
      user.id,
      body?.reason,
    );
    return {
      success: true,
      message: `Credit note ${creditNote.creditNoteNumber} has been voided`,
      data: creditNote,
    };
  }
}
