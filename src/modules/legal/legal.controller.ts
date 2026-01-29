import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { LegalService } from './legal.service';
import {
  LegalDocumentDto,
  LegalConsentDto,
  GetLegalDocumentQueryDto,
} from './legal.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Legal')
@Controller('legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  @Get('terms')
  @Public()
  @ApiOperation({
    summary: 'Get Terms of Service',
    description: 'Retrieve the current Terms of Service document',
  })
  @ApiResponse({
    status: 200,
    description: 'Terms of Service document',
    type: LegalDocumentDto,
  })
  getTermsOfService(
    @Query() query: GetLegalDocumentQueryDto,
  ): LegalDocumentDto {
    return this.legalService.getTermsOfService(query.locale || 'en');
  }

  @Get('privacy')
  @Public()
  @ApiOperation({
    summary: 'Get Privacy Policy',
    description: 'Retrieve the current Privacy Policy document',
  })
  @ApiResponse({
    status: 200,
    description: 'Privacy Policy document',
    type: LegalDocumentDto,
  })
  getPrivacyPolicy(@Query() query: GetLegalDocumentQueryDto): LegalDocumentDto {
    return this.legalService.getPrivacyPolicy(query.locale || 'en');
  }

  @Post('consent')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Record legal consent',
    description:
      'Record user consent for a legal document (Terms or Privacy Policy)',
  })
  @ApiResponse({
    status: 201,
    description: 'Consent recorded successfully',
  })
  async recordConsent(
    @Body() consent: LegalConsentDto,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    const userId = (req as any).user?.id;
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();

    await this.legalService.recordConsent(
      {
        ...consent,
        ip_address: ipAddress,
      },
      userId,
    );

    return { success: true };
  }
}
