import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { RulesetConfig } from '@decisioning/shared-types';

function loadRuleset(filename: string): RulesetConfig {
  const filePath = join(__dirname, 'rulesets', filename);
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (error) {
    throw new Error(`Failed to load ruleset "${filename}" from ${filePath}: ${error}`);
  }
}

const RULESETS: Record<string, RulesetConfig> = {
  'site-abc': loadRuleset('site-abc.json'),
};

@Injectable()
export class SiteConfigService {
  private readonly logger = new Logger(SiteConfigService.name);
  private readonly etagCache = new Map<string, string>();

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async getRuleset(siteId: string): Promise<RulesetConfig> {
    const cacheKey = `config:${siteId}`;
    const cached = await this.cache.get<RulesetConfig>(cacheKey);
    if (cached) return cached;

    const config = RULESETS[siteId];
    if (!config) {
      throw new NotFoundException(`Ruleset not found for siteId: ${siteId}`);
    }

    await this.cache.set(cacheKey, config, 300_000);
    this.logger.debug(`Cached ruleset for ${siteId}`);
    return config;
  }

  generateETag(data: unknown): string {
    const json = JSON.stringify(data);
    const cached = this.etagCache.get(json);
    if (cached) return cached;

    const hash = createHash('sha256').update(json).digest('hex').slice(0, 16);
    const etag = `"${hash}"`;
    this.etagCache.set(json, etag);
    return etag;
  }
}
