import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, AuthenticatedRequest } from '../../../../common/guards';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';
import {
  CreateContactDto,
  UpdateContactDto,
  SearchContactsDto,
  SyncContactsDto,
  InviteContactDto,
  CheckContactsDto,
} from '../dto/requests';
import {
  ContactResponse,
  ContactListResponse,
  SyncContactsResponse,
  InviteContactResponse,
} from '../dto/responses';
import { ContactService } from '../services';
import { UserRepository } from '../../../user/infrastructure/repositories';

@ApiTags('Contacts')
@Controller('contacts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContactController {
  constructor(
    private readonly contactService: ContactService,
    private readonly userRepository: UserRepository,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new contact' })
  @ApiResponse({ status: 201, type: ContactResponse })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Contact already exists' })
  async createContact(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateContactDto,
  ): Promise<ContactResponse> {
    const contact = await this.contactService.createContact({
      userId: req.user.id,
      name: dto.name,
      phone: dto.phone,
      walletAddress: dto.walletAddress,
      username: dto.username,
    });

    return ContactResponse.fromDomain(contact);
  }

  @Get()
  @ApiOperation({ summary: 'Get all contacts (paginated)' })
  @ApiResponse({ status: 200, type: ContactListResponse })
  async getContacts(
    @Request() req: AuthenticatedRequest,
    @Query() pagination: PaginationQueryDto,
  ): Promise<ContactListResponse> {
    const contacts = await this.contactService.getContacts(req.user.id);
    // Apply pagination in-memory (for small contact lists)
    const start = pagination.skip;
    const end = start + pagination.take;
    const paged = contacts.slice(start, end);
    return ContactListResponse.fromDomain(paged);
  }

  @Get('favorites')
  @ApiOperation({ summary: 'Get favorite contacts' })
  @ApiResponse({ status: 200, type: ContactListResponse })
  async getFavorites(
    @Request() req: AuthenticatedRequest,
  ): Promise<ContactListResponse> {
    const contacts = await this.contactService.getFavorites(req.user.id);
    return ContactListResponse.fromDomain(contacts);
  }

  @Get('recents')
  @ApiOperation({ summary: 'Get recent contacts' })
  @ApiResponse({ status: 200, type: ContactListResponse })
  async getRecents(
    @Request() req: AuthenticatedRequest,
  ): Promise<ContactListResponse> {
    const contacts = await this.contactService.getRecents(req.user.id);
    return ContactListResponse.fromDomain(contacts);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search contacts by name or username' })
  @ApiResponse({ status: 200, type: ContactListResponse })
  async searchContacts(
    @Request() req: AuthenticatedRequest,
    @Query() dto: SearchContactsDto,
  ): Promise<ContactListResponse> {
    const contacts = await this.contactService.searchContacts(
      req.user.id,
      dto.query,
    );
    return ContactListResponse.fromDomain(contacts);
  }

  @Get('lookup')
  @ApiOperation({
    summary: 'Search registered Korido users for contact discovery',
    description:
      'Returns masked registered users that match a phone, name, or username query.',
  })
  @ApiResponse({ status: 200, description: 'Korido users matching query' })
  async lookupKoridoUsers(
    @Request() req: AuthenticatedRequest,
    @Query('query') query: string,
  ) {
    const trimmed = query?.trim();
    if (!trimmed || trimmed.length < 2) {
      return { users: [], total: 0 };
    }

    const users = await this.userRepository.search(trimmed, 20);
    const results = users
      .filter((user) => user.id !== req.user.id)
      .map((user) => ({
        userId: user.id,
        displayName: user.displayName,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone ? `${user.phone.substring(0, 6)}****` : null,
        avatarUrl: user.avatarUrl,
        isKoridoUser: true,
      }));

    return { users: results, total: results.length };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a contact' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({ status: 200, type: ContactResponse })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async updateContact(
    @Request() req: AuthenticatedRequest,
    @Param('id') contactId: string,
    @Body() dto: UpdateContactDto,
  ): Promise<ContactResponse> {
    const contact = await this.contactService.updateContact({
      contactId,
      userId: req.user.id,
      name: dto.name,
      isFavorite: dto.isFavorite,
    });

    return ContactResponse.fromDomain(contact);
  }

  @Put(':id/favorite')
  @ApiOperation({ summary: 'Toggle contact favorite status' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({ status: 200, type: ContactResponse })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async toggleFavorite(
    @Request() req: AuthenticatedRequest,
    @Param('id') contactId: string,
  ): Promise<ContactResponse> {
    // Get current status and toggle
    const contacts = await this.contactService.getContacts(req.user.id);
    const existingContact = contacts.find((c) => c.id === contactId);

    const contact = await this.contactService.updateContact({
      contactId,
      userId: req.user.id,
      isFavorite: existingContact ? !existingContact.isFavorite : true,
    });

    return ContactResponse.fromDomain(contact);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a contact' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({ status: 204, description: 'Contact deleted' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async deleteContact(
    @Request() req: AuthenticatedRequest,
    @Param('id') contactId: string,
  ): Promise<void> {
    await this.contactService.deleteContact(contactId, req.user.id);
  }

  @Post('check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check which phone numbers are registered Korido users',
    description:
      'Accepts up to 500 phone numbers and returns matching registered users.',
  })
  @ApiResponse({ status: 200, description: 'Registered users found' })
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async checkContacts(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CheckContactsDto,
  ) {
    const users = await this.userRepository.findActiveVerifiedByPhones(
      dto.phoneNumbers,
    );

    return {
      registered: users
        .filter((u) => u.id !== req.user.id)
        .map((u) => ({
          phone: u.phone,
          userId: u.id,
          displayName: u.displayName,
        })),
    };
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync phone contacts to find JoonaPay users',
    description:
      'Accepts hashed phone numbers (SHA-256) for privacy. Returns matching JoonaPay users.',
  })
  @ApiResponse({ status: 200, type: SyncContactsResponse })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async syncContacts(
    @Request() req: AuthenticatedRequest,
    @Body() dto: SyncContactsDto,
  ): Promise<SyncContactsResponse> {
    const result = await this.contactService.syncContacts(
      req.user.id,
      dto.phoneHashes,
    );

    const response = new SyncContactsResponse();
    response.matches = result.matches;
    response.totalChecked = result.totalChecked;
    response.matchesFound = result.matchesFound;

    return response;
  }

  @Post('invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send invite to non-JoonaPay contact',
    description: 'Sends an SMS/WhatsApp invitation to join JoonaPay',
  })
  @ApiResponse({ status: 200, type: InviteContactResponse })
  @ApiResponse({ status: 400, description: 'Invalid phone number' })
  async inviteContact(
    @Request() req: AuthenticatedRequest,
    @Body() dto: InviteContactDto,
  ): Promise<InviteContactResponse> {
    const result = await this.contactService.inviteContact(
      req.user.id,
      dto.phone,
    );

    const response = new InviteContactResponse();
    response.success = result.success;
    response.message = result.message;

    return response;
  }
}
