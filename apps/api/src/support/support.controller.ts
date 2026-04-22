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