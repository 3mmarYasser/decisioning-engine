import { Module } from '@nestjs/common';
import { DecideController } from './decide.controller';
import { DecideService } from './decide.service';
import { SiteConfigModule } from '../config/config.module';

@Module({
  imports: [SiteConfigModule],
  controllers: [DecideController],
  providers: [DecideService],
})
export class DecideModule {}
