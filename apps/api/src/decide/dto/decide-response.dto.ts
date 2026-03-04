import { ApiProperty } from '@nestjs/swagger';

export class DecideResponseDto {
  @ApiProperty({ description: 'Selected variant identifier', example: 'variant-de' })
  variantId!: string;

  @ApiProperty({
    description: 'Personalised headline to display',
    example: 'Willkommen — personalisierte Erlebnisse, datenschutzkonform',
  })
  headline!: string;

  @ApiProperty({
    description: 'Feature flags for this variant',
    type: 'object',
    additionalProperties: { type: 'boolean' },
    example: { showLocalDeals: true, showGdprBanner: true },
  })
  flags!: Record<string, boolean>;

  @ApiProperty({ description: 'Config version used for this decision', example: '1.0.0' })
  configVersion!: string;
}
