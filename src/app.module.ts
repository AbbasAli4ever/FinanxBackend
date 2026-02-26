import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { EmailModule } from './modules/email/email.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { CustomersModule } from './modules/customers/customers.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { BillsModule } from './modules/bills/bills.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { JournalEntriesModule } from './modules/journal-entries/journal-entries.module';
import { ReportsModule } from './modules/reports/reports.module';
import { CreditNotesModule } from './modules/credit-notes/credit-notes.module';
import { DebitNotesModule } from './modules/debit-notes/debit-notes.module';
import { EstimatesModule } from './modules/estimates/estimates.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),
    DatabaseModule,
    EmailModule,
    AuthModule,
    UsersModule,
    RolesModule,
    AccountsModule,
    CustomersModule,
    VendorsModule,
    CategoriesModule,
    ProductsModule,
    InvoicesModule,
    BillsModule,
    ExpensesModule,
    JournalEntriesModule,
    ReportsModule,
    CreditNotesModule,
    DebitNotesModule,
    EstimatesModule,
    PurchaseOrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
