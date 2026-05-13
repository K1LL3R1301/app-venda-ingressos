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
import { CreateAdminSupportTicketDto } from './dto/create-admin-support-ticket.dto';
import { ReviewAdminSupportTicketDto } from './dto/review-admin-support-ticket.dto';
import { AdminSupportTicketsService } from './admin-support-tickets.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    email: string;
    role: string;
    name?: string;
    cpf?: string;
  };
};

@ApiTags('Admin Support Tickets')
@Controller('admin-support-tickets')
export class AdminSupportTicketsController {
  constructor(private readonly adminSupportTicketsService: AdminSupportTicketsService) {}

  @Post()
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(
    @Body() body: CreateAdminSupportTicketDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminSupportTicketsService.create(req.user, body);
  }

  @Get('mine')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  listMine(@Req() req: AuthenticatedRequest) {
    return this.adminSupportTicketsService.listMine(req.user.sub);
  }

  @Get()
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  listAll() {
    return this.adminSupportTicketsService.listAll();
  }

  @Patch(':id/review')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  review(
    @Param('id') id: string,
    @Body() body: ReviewAdminSupportTicketDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminSupportTicketsService.review(id, req.user, body);
  }
}

