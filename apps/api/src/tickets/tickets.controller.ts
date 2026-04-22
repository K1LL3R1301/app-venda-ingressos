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
import { ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TicketsService } from './tickets.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    email: string;
    role: string;
    name?: string;
  };
};

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  findAll() {
    return this.ticketsService.findAll();
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('customer')
  @Roles('CUSTOMER', 'ADMIN', 'OPERATOR')
  findCustomerTickets(@Req() req: AuthenticatedRequest) {
    return this.ticketsService.findCustomerTickets(req.user.sub);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('customer/transfers/incoming')
  @Roles('CUSTOMER', 'ADMIN', 'OPERATOR')
  findIncomingTransferRequests(@Req() req: AuthenticatedRequest) {
    return this.ticketsService.findIncomingTransferRequests(req.user.sub);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('customer/transfers/outgoing')
  @Roles('CUSTOMER', 'ADMIN', 'OPERATOR')
  findOutgoingTransferRequests(@Req() req: AuthenticatedRequest) {
    return this.ticketsService.findOutgoingTransferRequests(req.user.sub);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('customer/transfers/:transferRequestId')
  @Roles('CUSTOMER', 'ADMIN', 'OPERATOR')
  findTransferRequestById(
    @Param('transferRequestId') transferRequestId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.findTransferRequestById(
      transferRequestId,
      req.user.sub,
    );
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('customer/:ticketId/transfer')
  @Roles('CUSTOMER', 'ADMIN', 'OPERATOR')
  createTransferRequest(
    @Param('ticketId') ticketId: string,
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      targetCpf?: string;
      targetEmail?: string;
    },
  ) {
    return this.ticketsService.createTransferRequest(
      ticketId,
      req.user.sub,
      body,
    );
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('customer/transfers/:transferRequestId/accept')
  @Roles('CUSTOMER', 'ADMIN', 'OPERATOR')
  acceptTransferRequest(
    @Param('transferRequestId') transferRequestId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.acceptTransferRequest(
      transferRequestId,
      req.user.sub,
    );
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('customer/transfers/:transferRequestId/reject')
  @Roles('CUSTOMER', 'ADMIN', 'OPERATOR')
  rejectTransferRequest(
    @Param('transferRequestId') transferRequestId: string,
    @Req() req: AuthenticatedRequest,
    @Body() body?: { reason?: string },
  ) {
    return this.ticketsService.rejectTransferRequest(
      transferRequestId,
      req.user.sub,
      body?.reason,
    );
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('customer/transfers/:transferRequestId/cancel')
  @Roles('CUSTOMER', 'ADMIN', 'OPERATOR')
  cancelTransferRequest(
    @Param('transferRequestId') transferRequestId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.cancelTransferRequest(
      transferRequestId,
      req.user.sub,
    );
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.ticketsService.findByCode(code);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.ticketsService.findById(id);
  }
}