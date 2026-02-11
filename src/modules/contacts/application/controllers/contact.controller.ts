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
} from '../dto/requests';
import {
  ContactResponse,
  ContactListResponse,
  SyncContactsResponse,
  InviteContactResponse,
} from '../dto/responses';
import { ContactService } from '../services';

@ApiTags('Contacts')
@Controller('contacts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

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
    @Body() dto: SyncContactsDto,
  ): Promise<SyncContactsResponse> {
    const result = await this.contactService.syncContacts(dto.phoneHashes);

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
    @Body() dto: InviteContactDto,
  ): Promise<InviteContactResponse> {
    const result = await this.contactService.inviteContact(dto.phone);

    const response = new InviteContactResponse();
    response.success = result.success;
    response.message = result.message;

    return response;
  }
}
