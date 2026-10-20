import { Module } from '@nestjs/common';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  imports: [WorkOrdersModule],
  controllers: [ContractsController],
  providers: [ContractsService],
})
export class ContractsModule {}
