import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { DecideService } from './decide.service';
import { SiteConfigService } from '../config/config.service';
import type { RulesetConfig } from '@decisioning/shared-types';

const MOCK_CONFIG: RulesetConfig = {
  siteId: 'site-abc',
  configVersion: '1.0.0',
  rules: [
    {
      id: 'rule-german-locale',
      priority: 1,
      conditions: [
        { field: 'country', operator: 'eq', value: 'DE' },
        { field: 'language', operator: 'eq', value: 'de' },
      ],
      variant: {
        variantId: 'variant-de',
        headline: 'Willkommen',
        flags: { showLocalDeals: true },
      },
    },
    {
      id: 'rule-mobile',
      priority: 2,
      conditions: [{ field: 'deviceType', operator: 'eq', value: 'mobile' }],
      variant: {
        variantId: 'variant-mobile',
        headline: 'Mobile-first experience',
        flags: { compactLayout: true },
      },
    },
  ],
  fallback: {
    variantId: 'variant-default',
    headline: 'Welcome',
    flags: { showOnboarding: true },
  },
};

describe('DecideService', () => {
  let service: DecideService;

  beforeEach(async () => {
    const mockCache = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecideService,
        SiteConfigService,
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    service = module.get<DecideService>(DecideService);

    jest
      .spyOn(module.get(SiteConfigService), 'getRuleset')
      .mockResolvedValue(MOCK_CONFIG);
  });

  it('should return the German variant when country=DE and language=de', async () => {
    const result = await service.decide(
      'site-abc',
      { visitorId: 'v-1', country: 'DE', language: 'de', deviceType: 'desktop' },
      { marketing: true },
    );

    expect(result.variantId).toBe('variant-de');
    expect(result.headline).toBe('Willkommen');
    expect(result.configVersion).toBe('1.0.0');
  });

  it('should ignore visitorId when marketing=false and return identical results for different visitors', async () => {
    const baseVisitor = { country: 'US', language: 'en', deviceType: 'desktop' };

    const resultA = await service.decide(
      'site-abc',
      { ...baseVisitor, visitorId: 'visitor-AAA' },
      { marketing: false },
    );

    const resultB = await service.decide(
      'site-abc',
      { ...baseVisitor, visitorId: 'visitor-ZZZ' },
      { marketing: false },
    );

    expect(resultA.variantId).toBe(resultB.variantId);
    expect(resultA.headline).toBe(resultB.headline);

    // Both should hit fallback since no rules match US/en/desktop
    expect(resultA.variantId).toBe('variant-default');
  });
});
