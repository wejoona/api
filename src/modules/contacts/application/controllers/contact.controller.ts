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
import {
  CreateContactDto,
  UpdateContactDto,
  SearchContactsDto,
} from '../dto/requests';
import { ContactResponse, ContactListResponse } from '../dto/responses';
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
  @ApiOperation({ summary: 'Get all contacts' })
  @ApiResponse({ status: 200, type: ContactListResponse })
  async getContacts(
    @Request() req: AuthenticatedRequest,
  ): Promise<ContactListResponse> {
    const contacts = await this.contactService.getContacts(req.user.id);
    return ContactListResponse.fromDomain(contacts);
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
}
