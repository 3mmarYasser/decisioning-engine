import { Controller, Get, Param, Req, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { SiteConfigService } from './config.service';

@ApiTags('config')
@Controller('config')
export class SiteConfigController {
  constructor(private readonly configService: SiteConfigService) {}

  @Get(':siteId')
  @ApiOperation({
    summary: 'Get ruleset configuration',
    description:
      'Returns the full ruleset JSON for a site, including all rules, conditions, and the fallback variant. ' +
      'Supports ETag-based conditional requests (If-None-Match) and sets Cache-Control headers for CDN/edge/browser caching.',
  })
  @ApiParam({ name: 'siteId', example: 'site-abc', description: 'Site identifier (alphanumeric + hyphens)' })
  @ApiResponse({ status: 200, description: 'Ruleset config returned successfully' })
  @ApiResponse({ status: 304, description: 'Not Modified — ETag matched' })
  @ApiResponse({ status: 404, description: 'Site not found' })
  async getConfig(
    @Param('siteId') siteId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const config = await this.configService.getRuleset(siteId);
    const etag = this.configService.generateETag(config);

    const clientEtag = req.headers['if-none-match'];
    if (clientEtag === etag) {
      res.status(HttpStatus.NOT_MODIFIED);
      return;
    }

    res.setHeader('ETag', etag);
    res.setHeader(
      'Cache-Control',
      'public, max-age=60, s-maxage=300, stale-while-revalidate=60',
    );

    return config;
  }
}
