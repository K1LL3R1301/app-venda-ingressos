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
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CancelTicketDto } from './dto/cancel-ticket.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    email: string;
    role: string;
  };
};

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() body: CreateOrderDto) {
    return this.ordersService.create(body);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('customer')
  @Roles('CUSTOMER', 'ADMIN', 'OPERATOR')
  createCustomerOrder(
    @Body() body: CreateOrderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ordersService.createCustomerOrder(
      req.user.sub,
      req.user.email,
      body,
    );
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('customer')
  @Roles('CUSTOMER', 'ADMIN', 'OPERATOR')
  findCustomerOrders(@Req() req: AuthenticatedRequest) {
    return this.ordersService.findCustomerOrders(req.user.email);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('customer/:id')
  @Roles('CUSTOMER', 'ADMIN', 'OPERATOR')
  findCustomerOrderById(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ordersService.findCustomerOrderById(id, req.user.email);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('customer/:id/cancel')
  @Roles('CUSTOMER', 'ADMIN', 'OPERATOR')
  cancelCustomerOrder(
    @Param('id') id: string,
    @Body() body: CancelOrderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ordersService.cancelCustomerOrder(
      id,
      req.user.sub,
      req.user.email,
      body,
    );
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('customer/tickets/:ticketId/cancel')
  @Roles('CUSTOMER', 'ADMIN', 'OPERATOR')
  cancelCustomerTicket(
    @Param('ticketId') ticketId: string,
    @Body() body: CancelTicketDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ordersService.cancelCustomerTicket(
      ticketId,
      req.user.sub,
      req.user.email,
      body,
    );
  }

  @Get('event/:eventId')
  findByEvent(@Param('eventId') eventId: string) {
    return this.ordersService.findByEvent(eventId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Body() body: CancelOrderDto) {
    return this.ordersService.cancel(id, body);
  }
}