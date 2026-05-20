// @ts-nocheck
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateCustomerSupportMessageDto } from './dto/create-customer-support-message.dto';
import { CreateCustomerSupportThreadDto } from './dto/create-customer-support-thread.dto';
import { CreateLinkedSupportThreadDto } from './dto/create-linked-support-thread.dto';
import {
  LinkedSupportForwardDto,
  LinkedSupportMessageDto,
  LinkedSupportResolveDto,
  LinkedSupportReturnDto,
} from './dto/linked-support-action.dto';
import { SupportService } from './support.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    email: string;
    role: string;
    name?: string;
  };
};

@ApiTags('Support')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  private actorFromRequest(req: AuthenticatedRequest) {
    return {
      userId: req.user.sub,
      email: req.user.email,
      role: req.user.role,
      name: req.user.name || req.user.email,
    };
  }

  @Post('linked')
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  createLinkedThread(
    @Body() body: CreateLinkedSupportThreadDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.supportService.createLinkedThread(
      this.actorFromRequest(req),
      body,
    );
  }

  @Get('linked/admin')
  @Roles('ADMIN', 'SUPER_ADMIN')
  listLinkedProducerThreads(@Req() req: AuthenticatedRequest) {
    return this.supportService.listLinkedThreads(
      this.actorFromRequest(req),
      'PRODUCER',
    );
  }

  @Get('linked/operator')
  @Roles('OPERATOR', 'ADMIN', 'SUPER_ADMIN')
  listLinkedOperatorThreads(@Req() req: AuthenticatedRequest) {
    return this.supportService.listLinkedThreads(
      this.actorFromRequest(req),
      'OPERATOR',
    );
  }

  @Get('linked/super')
  @Roles('SUPER_ADMIN')
  listLinkedSuperAdminThreads(@Req() req: AuthenticatedRequest) {
    return this.supportService.listLinkedThreads(
      this.actorFromRequest(req),
      'SUPER_ADMIN',
    );
  }

  @Get('linked/:threadId')
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN', 'CUSTOMER')
  findLinkedThreadById(
    @Param('threadId') threadId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.supportService.findLinkedThreadById(
      this.actorFromRequest(req),
      threadId,
    );
  }

  @Post('linked/:threadId/messages')
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN', 'CUSTOMER')
  addLinkedMessage(
    @Param('threadId') threadId: string,
    @Body() body: LinkedSupportMessageDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.supportService.addLinkedMessage(
      this.actorFromRequest(req),
      threadId,
      body,
    );
  }

  @Post('linked/:threadId/forward-super')
  @Roles('ADMIN', 'OPERATOR')
  forwardLinkedToSuperAdmin(
    @Param('threadId') threadId: string,
    @Body() body: LinkedSupportForwardDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.supportService.forwardLinkedToSuperAdmin(
      this.actorFromRequest(req),
      threadId,
      body,
    );
  }

  @Post('linked/:threadId/return')
  @Roles('SUPER_ADMIN')
  returnLinkedFromSuperAdmin(
    @Param('threadId') threadId: string,
    @Body() body: LinkedSupportReturnDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.supportService.returnLinkedFromSuperAdmin(
      this.actorFromRequest(req),
      threadId,
      body,
    );
  }

  @Post('linked/:threadId/resolve')
  @Roles('ADMIN', 'OPERATOR', 'SUPER_ADMIN')
  resolveLinkedThread(
    @Param('threadId') threadId: string,
    @Body() body: LinkedSupportResolveDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.supportService.resolveLinkedThread(
      this.actorFromRequest(req),
      threadId,
      body,
    );
  }

  @Post('customer')
  @Roles('CUSTOMER', 'ADMIN', 'OPERATOR')
  createCustomerThread(
    @Body() body: CreateCustomerSupportThreadDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.supportService.createCustomerThread(
      req.user.sub,
      req.user.email,
      req.user.name || '',
      body,
    );
  }

  @Get('customer')
  @Roles('CUSTOMER', 'ADMIN', 'OPERATOR')
  listCustomerThreads(@Req() req: AuthenticatedRequest) {
    return this.supportService.listCustomerThreads(req.user.email);
  }

  @Get('customer/:threadId')
  @Roles('CUSTOMER', 'ADMIN', 'OPERATOR')
  findCustomerThreadById(
    @Param('threadId') threadId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.supportService.findCustomerThreadById(
      threadId,
      req.user.email,
    );
  }

  @Post('customer/:threadId/messages')
  @Roles('CUSTOMER', 'ADMIN', 'OPERATOR')
  createCustomerMessage(
    @Param('threadId') threadId: string,
    @Body() body: CreateCustomerSupportMessageDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.supportService.createCustomerMessage(
      threadId,
      req.user.sub,
      req.user.email,
      req.user.name || '',
      body,
    );
  }

  @Patch('customer/:threadId/reopen')
  @Roles('CUSTOMER', 'ADMIN', 'OPERATOR')
  reopenCustomerThread(
    @Param('threadId') threadId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.supportService.reopenThread(threadId, req.user.sub);
  }

  @Get('admin')
  @Roles('ADMIN', 'OPERATOR')
  listAdminThreads() {
    return this.supportService.listAdminThreads();
  }

  @Get('admin/:threadId')
  @Roles('ADMIN', 'OPERATOR')
  findAdminThreadById(@Param('threadId') threadId: string) {
    return this.supportService.findAdminThreadById(threadId);
  }

  @Post('admin/:threadId/messages')
  @Roles('ADMIN', 'OPERATOR')
  createAdminMessage(
    @Param('threadId') threadId: string,
    @Body() body: CreateCustomerSupportMessageDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.supportService.createAdminMessage(
      threadId,
      req.user.sub,
      req.user.name || 'Atendente',
      req.user.email,
      body,
    );
  }

  @Patch('admin/:threadId/close')
  @Roles('ADMIN', 'OPERATOR')
  closeThread(
    @Param('threadId') threadId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.supportService.closeThread(threadId, req.user.sub);
  }

  @Patch('admin/:threadId/reopen')
  @Roles('ADMIN', 'OPERATOR')
  reopenAdminThread(
    @Param('threadId') threadId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.supportService.reopenThread(threadId, req.user.sub);
  }
}