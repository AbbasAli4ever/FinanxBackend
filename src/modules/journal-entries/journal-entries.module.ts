import { Module } from '@nestjs/common';
import { JournalEntriesController } from './journal-entries.controller';
import { JournalEntriesService } from './journal-entries.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [JournalEntriesController],
  providers: [JournalEntriesService, PrismaService],
  exports: [JournalEntriesService],
})
export class JournalEntriesModule {}
