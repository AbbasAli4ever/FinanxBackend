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
import { JournalEntriesService } from './journal-entries.service';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto';
import { QueryJournalEntriesDto } from './dto/query-journal-entries.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('journal-entries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class JournalEntriesController {
  constructor(private readonly journalEntriesService: JournalEntriesService) {}

  // =====================================================================
  // STATIC ROUTES (before :id to avoid param conflicts)
  // =====================================================================

  @Get('summary')
  @RequirePermissions('journal:view')
  async getSummary(@CurrentUser() user: any) {
    const data = await this.journalEntriesService.getSummary(user.companyId);
    return {
      success: true,
      message: 'Journal entry summary retrieved successfully',
      data,
    };
  }

  @Get('next-number')
  @RequirePermissions('journal:create')
  async getNextNumber(@CurrentUser() user: any) {
    const nextEntryNumber =
      await this.journalEntriesService.getNextEntryNumber(user.companyId);
    return {
      success: true,
      message: 'Next entry number retrieved successfully',
      data: { nextEntryNumber },
    };
  }

  @Get('statuses')
  @RequirePermissions('journal:view')
  async getStatuses() {
    const data = this.journalEntriesService.getStatuses();
    return {
      success: true,
      message: 'Journal entry statuses retrieved successfully',
      data,
    };
  }

  @Get('entry-types')
  @RequirePermissions('journal:view')
  async getEntryTypes() {
    const data = this.journalEntriesService.getEntryTypes();
    return {
      success: true,
      message: 'Journal entry types retrieved successfully',
      data,
    };
  }

  // =====================================================================
  // STANDARD CRUD
  // =====================================================================

  @Get()
  @RequirePermissions('journal:view')
  async findAll(
    @CurrentUser() user: any,
    @Query() query: QueryJournalEntriesDto,
  ) {
    const data = await this.journalEntriesService.findAll(
      user.companyId,
      query,
    );
    return {
      success: true,
      message: 'Journal entries retrieved successfully',
      data,
    };
  }

  @Get(':id')
  @RequirePermissions('journal:view')
  async findOne(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.journalEntriesService.findOne(id, user.companyId);
    return {
      success: true,
      message: 'Journal entry retrieved successfully',
      data,
    };
  }

  @Post()
  @RequirePermissions('journal:create')
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateJournalEntryDto,
  ) {
    const data = await this.journalEntriesService.create(
      dto,
      user.companyId,
      user.id,
    );
    return {
      success: true,
      message: `Journal entry ${data.entryNumber} created successfully`,
      data,
    };
  }

  @Patch(':id')
  @RequirePermissions('journal:edit')
  async update(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJournalEntryDto,
  ) {
    const data = await this.journalEntriesService.update(
      id,
      dto,
      user.companyId,
    );
    return {
      success: true,
      message: `Journal entry ${data.entryNumber} updated successfully`,
      data,
    };
  }

  @Delete(':id')
  @RequirePermissions('journal:delete')
  async delete(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.journalEntriesService.delete(id, user.companyId);
    return {
      success: true,
      message: result.message,
      data: null,
    };
  }

  // =====================================================================
  // LIFECYCLE ACTIONS
  // =====================================================================

  @Post(':id/post')
  @RequirePermissions('journal:post')
  async postEntry(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.journalEntriesService.post(
      id,
      user.companyId,
      user.id,
    );
    return {
      success: true,
      message: `Journal entry ${data.entryNumber} has been posted`,
      data,
    };
  }

  @Post(':id/void')
  @RequirePermissions('journal:post')
  async voidEntry(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
  ) {
    const data = await this.journalEntriesService.voidEntry(
      id,
      user.companyId,
      body?.reason,
    );
    return {
      success: true,
      message: `Journal entry ${data.entryNumber} has been voided`,
      data,
    };
  }

  @Post(':id/reverse')
  @RequirePermissions('journal:create')
  async reverse(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.journalEntriesService.reverse(
      id,
      user.companyId,
      user.id,
    );
    return {
      success: true,
      message: `Reversal entry ${data.entryNumber} created as DRAFT`,
      data,
    };
  }

  @Post(':id/duplicate')
  @RequirePermissions('journal:create')
  async duplicate(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.journalEntriesService.duplicate(
      id,
      user.companyId,
      user.id,
    );
    return {
      success: true,
      message: `Journal entry duplicated as ${data.entryNumber}`,
      data,
    };
  }
}
