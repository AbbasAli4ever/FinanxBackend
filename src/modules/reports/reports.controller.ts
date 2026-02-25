import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { QueryDateRangeDto } from './dto/query-reports.dto';

interface ApiResponseDto {
  success: boolean;
  message: string;
  data: any;
}

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // =========================================================================
  // TRIAL BALANCE
  // GET /reports/trial-balance?asOfDate=YYYY-MM-DD
  // =========================================================================
  @Get('trial-balance')
  @RequirePermissions('account:view')
  async getTrialBalance(
    @CurrentUser() user: any,
    @Query() query: QueryDateRangeDto,
  ): Promise<ApiResponseDto> {
    const data = await this.reportsService.getTrialBalance(
      user.companyId,
      query.asOfDate,
    );
    return {
      success: true,
      message: 'Trial balance retrieved successfully',
      data,
    };
  }

  // =========================================================================
  // ACCOUNT LEDGER
  // GET /reports/account-ledger/:accountId?startDate=...&endDate=...
  // =========================================================================
  @Get('account-ledger/:accountId')
  @RequirePermissions('account:view')
  async getAccountLedger(
    @CurrentUser() user: any,
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query() query: QueryDateRangeDto,
  ): Promise<ApiResponseDto> {
    const data = await this.reportsService.getAccountLedger(
      accountId,
      user.companyId,
      query.startDate,
      query.endDate,
    );
    return {
      success: true,
      message: 'Account ledger retrieved successfully',
      data,
    };
  }

  // =========================================================================
  // INCOME STATEMENT (P&L)
  // GET /reports/income-statement?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
  // =========================================================================
  @Get('income-statement')
  @RequirePermissions('account:view')
  async getIncomeStatement(
    @CurrentUser() user: any,
    @Query() query: QueryDateRangeDto,
  ): Promise<ApiResponseDto> {
    const data = await this.reportsService.getIncomeStatement(
      user.companyId,
      query.startDate,
      query.endDate,
    );
    return {
      success: true,
      message: 'Income statement retrieved successfully',
      data,
    };
  }

  // =========================================================================
  // BALANCE SHEET
  // GET /reports/balance-sheet?asOfDate=YYYY-MM-DD
  // =========================================================================
  @Get('balance-sheet')
  @RequirePermissions('account:view')
  async getBalanceSheet(
    @CurrentUser() user: any,
    @Query() query: QueryDateRangeDto,
  ): Promise<ApiResponseDto> {
    const data = await this.reportsService.getBalanceSheet(
      user.companyId,
      query.asOfDate,
    );
    return {
      success: true,
      message: 'Balance sheet retrieved successfully',
      data,
    };
  }
}
