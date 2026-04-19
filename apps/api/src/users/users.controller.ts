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
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    email: string;
    role: string;
  };
};

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Get('me/wallet')
  findMyWallet(@Req() req: AuthenticatedRequest) {
    return this.usersService.getWalletSummary(req.user.sub);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.usersService.findAll();
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  @Roles('ADMIN')
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.usersService.update(id, body);
  }
}