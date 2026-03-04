import { Module } from '@nestjs/common';
import { SiteConfigController } from './config.controller';
import { SiteConfigService } from './config.service';

@Module({
  controllers: [SiteConfigController],
  providers: [SiteConfigService],
  exports: [SiteConfigService],
})
export class SiteConfigModule {}
