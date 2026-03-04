import { Injectable, Logger } from '@nestjs/common';
import type { DecideResponse, ConsentFlags } from '@decisioning/shared-types';
import { SiteConfigService } from '../config/config.service';
import { evaluate } from '../rules/rule-engine';
import { sanitizeForConsent } from '../consent/consent.sanitizer';
import type { VisitorContextDto, ConsentFlagsDto } from './dto/decide-request.dto';

@Injectable()
export class DecideService {
  private readonly logger = new Logger(DecideService.name);

  constructor(private readonly configService: SiteConfigService) {}

  async decide(
    siteId: string,
    visitor: VisitorContextDto,
    consent: ConsentFlagsDto,
  ): Promise<DecideResponse> {
    const config = await this.configService.getRuleset(siteId);
    const safeVisitor = sanitizeForConsent(visitor, consent as ConsentFlags);
    const variant = evaluate(config, safeVisitor);

    this.logger.log(
      `Decision: site=${siteId} variant=${variant.variantId} marketing=${consent.marketing}`,
    );

    return {
      variantId: variant.variantId,
      headline: variant.headline,
      flags: variant.flags,
      configVersion: config.configVersion,
    };
  }
}
