import { Global, Module } from '@nestjs/common';
import { FacilitiesController } from './facilities.controller';
import { RiskService } from './risk.service';

@Global()
@Module({
  controllers: [FacilitiesController],
  providers: [RiskService],
  exports: [RiskService],
})
export class FacilitiesModule {}
