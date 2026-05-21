import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrganizersService } from './organizers.service';
import { CreateOrganizerDto } from './dto/create-organizer.dto';
import { UpdateOrganizerFeeConfigDto } from './dto/update-organizer-fee-config.dto';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    email: string;
    role: string;
    cpf?: string;
  };
};

@Controller('organizers')
export class OrganizersController {
  constructor(private readonly service: OrganizersService) {}

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  create(@Body() body: CreateOrganizerDto, @Req() req: AuthenticatedRequest) {
    return this.service.create(body, req.user);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin-scope')
  @Roles('ADMIN', 'SUPER_ADMIN')
  findAdminScope(@Req() req: AuthenticatedRequest) {
    return this.service.findAdminScope(req.user);
  }


  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':organizerId/fee-config')
  @Roles('SUPER_ADMIN')
  getFeeConfig(
    @Param('organizerId') organizerId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.getFeeConfig(organizerId, req.user);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Put(':organizerId/fee-config')
  @Roles('SUPER_ADMIN')
  updateFeeConfig(
    @Param('organizerId') organizerId: string,
    @Body() body: UpdateOrganizerFeeConfigDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.updateFeeConfig(organizerId, body, req.user);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
