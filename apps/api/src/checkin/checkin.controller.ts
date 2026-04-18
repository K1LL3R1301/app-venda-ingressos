import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CheckinService } from './checkin.service';
import { CreateCheckinDto } from './dto/create-checkin.dto';

@ApiTags('Checkin')
@ApiBearerAuth('bearer')
@Controller('checkin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Post()
  @Roles('ADMIN', 'OPERATOR')
  create(@Body() body: CreateCheckinDto) {
    return this.checkinService.create(body);
  }

  @Get()
  @Roles('ADMIN', 'OPERATOR')
  findAll() {
    return this.checkinService.findAll();
  }
}