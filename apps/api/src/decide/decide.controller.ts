import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { DecideService } from './decide.service';
import { DecideRequestDto } from './dto/decide-request.dto';
import { DecideResponseDto } from './dto/decide-response.dto';

@ApiTags('decide')
@Controller('decide')
export class DecideController {
  constructor(private readonly decideService: DecideService) {}

  @Post()
  @ApiOperation({
    summary: 'Get personalisation decision',
    description:
      'Given a visitor context, consent flags, and site ID, evaluates the rule engine ' +
      'and returns the variant the visitor should see. When marketing consent is not granted, ' +
      'only consent-safe fields (country, language, deviceType, referrerDomain) influence the decision.',
  })
  @ApiBody({ type: DecideRequestDto })
  @ApiResponse({ status: 200, description: 'Decision returned', type: DecideResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 404, description: 'Site not found' })
  async decide(@Body() dto: DecideRequestDto): Promise<DecideResponseDto> {
    return this.decideService.decide(dto.siteId, dto.visitor, dto.consent);
  }
}
