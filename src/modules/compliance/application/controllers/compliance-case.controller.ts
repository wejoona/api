import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { User } from '@/modules/user/domain/entities/user.entity';
import { ComplianceCaseService } from '../services/compliance-case.service';
import {
  CreateCaseDto,
  UpdateCaseDto,
  EscalateCaseDto,
  CloseCaseDto,
  AddCaseNoteDto,
  AddCaseEvidenceDto,
  SearchCasesDto,
  CaseResponseDto,
  CaseNoteResponseDto,
  CaseEvidenceResponseDto,
  CaseStatsResponseDto,
} from '../dto/compliance-case.dto';

/**
 * Compliance Case Management Controller
 *
 * REST API endpoints for managing compliance cases, notes, and evidence.
 * All endpoints require authentication.
 */
@Controller('compliance/cases')
@UseGuards(JwtAuthGuard)
export class ComplianceCaseController {
  constructor(private readonly caseService: ComplianceCaseService) {}

  /**
   * Create a new compliance case
   */
  @Post()
  async createCase(
    @Body() dto: CreateCaseDto,
    @CurrentUser() user: User,
  ): Promise<CaseResponseDto> {
    return this.caseService.createCase(dto, user.id);
  }

  /**
   * Get case statistics
   */
  @Get('stats')
  async getStats(): Promise<CaseStatsResponseDto> {
    return this.caseService.getStats();
  }

  /**
   * Search cases with filters
   */
  @Get('search')
  async searchCases(
    @Query() dto: SearchCasesDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.caseService.searchCases(dto, page, limit);
  }

  /**
   * Get cases assigned to current user
   */
  @Get('my-cases')
  async getMyCases(@CurrentUser() user: User): Promise<CaseResponseDto[]> {
    return this.caseService.getCasesByAssignee(user.id);
  }

  /**
   * Get a case by ID
   */
  @Get(':id')
  async getCaseById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CaseResponseDto> {
    return this.caseService.getCaseById(id);
  }

  /**
   * Get a case by case number
   */
  @Get('number/:caseNumber')
  async getCaseByCaseNumber(
    @Param('caseNumber') caseNumber: string,
  ): Promise<CaseResponseDto> {
    return this.caseService.getCaseByCaseNumber(caseNumber);
  }

  /**
   * Get cases by subject user ID
   */
  @Get('subject/:userId')
  async getCasesBySubjectUser(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<CaseResponseDto[]> {
    return this.caseService.getCasesBySubjectUser(userId);
  }

  /**
   * Update a case
   */
  @Put(':id')
  async updateCase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCaseDto,
  ): Promise<CaseResponseDto> {
    return this.caseService.updateCase(id, dto);
  }

  /**
   * Assign a case to an agent
   */
  @Put(':id/assign/:agentId')
  async assignCase(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('agentId', ParseUUIDPipe) agentId: string,
  ): Promise<CaseResponseDto> {
    return this.caseService.assignCase(id, agentId);
  }

  /**
   * Start investigation on a case
   */
  @Put(':id/investigate')
  async startInvestigation(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CaseResponseDto> {
    return this.caseService.startInvestigation(id);
  }

  /**
   * Escalate a case
   */
  @Put(':id/escalate')
  async escalateCase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EscalateCaseDto,
  ): Promise<CaseResponseDto> {
    return this.caseService.escalateCase(id, dto);
  }

  /**
   * Close a case
   */
  @Put(':id/close')
  async closeCase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseCaseDto,
  ): Promise<CaseResponseDto> {
    return this.caseService.closeCase(id, dto);
  }

  /**
   * Reopen a case
   */
  @Put(':id/reopen')
  async reopenCase(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CaseResponseDto> {
    return this.caseService.reopenCase(id);
  }

  // Case Notes

  /**
   * Add a note to a case
   */
  @Post(':id/notes')
  async addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddCaseNoteDto,
    @CurrentUser() user: User,
  ): Promise<CaseNoteResponseDto> {
    return this.caseService.addNote(id, dto, user.id);
  }

  /**
   * Get all notes for a case
   */
  @Get(':id/notes')
  async getNotes(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CaseNoteResponseDto[]> {
    return this.caseService.getNotes(id);
  }

  /**
   * Delete a note
   */
  @Delete('notes/:noteId')
  async deleteNote(
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ): Promise<void> {
    return this.caseService.deleteNote(noteId);
  }

  // Case Evidence

  /**
   * Add evidence to a case
   */
  @Post(':id/evidence')
  async addEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddCaseEvidenceDto,
    @CurrentUser() user: User,
  ): Promise<CaseEvidenceResponseDto> {
    return this.caseService.addEvidence(id, dto, user.id);
  }

  /**
   * Get all evidence for a case
   */
  @Get(':id/evidence')
  async getEvidence(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CaseEvidenceResponseDto[]> {
    return this.caseService.getEvidence(id);
  }

  /**
   * Delete evidence
   */
  @Delete('evidence/:evidenceId')
  async deleteEvidence(
    @Param('evidenceId', ParseUUIDPipe) evidenceId: string,
  ): Promise<void> {
    return this.caseService.deleteEvidence(evidenceId);
  }
}
