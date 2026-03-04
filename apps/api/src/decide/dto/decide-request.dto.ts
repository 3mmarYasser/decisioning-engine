import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsObject,
  IsDefined,
  ValidateNested,
  MaxLength,
  Matches,
} from 'class-validator';

export class ConsentFlagsDto {
  @ApiProperty({ description: 'Whether marketing consent has been granted', example: true })
  @IsBoolean()
  marketing!: boolean;

  @ApiPropertyOptional({ description: 'Whether analytics consent has been granted', example: true })
  @IsBoolean()
  @IsOptional()
  analytics?: boolean;
}

export class VisitorContextDto {
  @ApiPropertyOptional({ description: 'Unique visitor identifier', example: 'visitor-123' })
  @IsString()
  @IsOptional()
  @MaxLength(256)
  visitorId?: string;

  @ApiPropertyOptional({ description: 'ISO country code', example: 'DE' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  country?: string;

  @ApiPropertyOptional({ description: 'Language code', example: 'de' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  language?: string;

  @ApiPropertyOptional({ description: 'Device type', example: 'mobile' })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  deviceType?: string;

  @ApiPropertyOptional({ description: 'Referrer domain', example: 'google.com' })
  @IsString()
  @IsOptional()
  @MaxLength(256)
  referrerDomain?: string;

  [key: string]: string | undefined;
}

export class DecideRequestDto {
  @ApiProperty({ description: 'Site identifier', example: 'site-abc' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, { message: 'siteId must be lowercase alphanumeric with hyphens' })
  @MaxLength(64)
  siteId!: string;

  @ApiProperty({ description: 'Current page URL', example: 'https://example.com/landing' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  url!: string;

  @ApiProperty({ description: 'Visitor context attributes', type: VisitorContextDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => VisitorContextDto)
  visitor!: VisitorContextDto;

  @ApiProperty({ description: 'Consent flags for the visitor', type: ConsentFlagsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ConsentFlagsDto)
  consent!: ConsentFlagsDto;
}
