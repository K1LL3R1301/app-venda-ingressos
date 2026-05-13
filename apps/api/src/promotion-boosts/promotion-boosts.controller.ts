import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreatePromotionBoostRequestDto } from './dto/create-promotion-boost-request.dto';
import { ReviewPromotionBoostRequestDto } from './dto/review-promotion-boost-request.dto';
import { PromotionBoostsService } from './promotion-boosts.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    email: string;
    role: string;
    name?: string;
    cpf?: string;
  };
};

@ApiTags('Promotion Boosts')
@Controller('promotion-boosts')
export class PromotionBoostsController {
  constructor(private readonly promotionBoostsService: PromotionBoostsService) {}

  @Get('plans')
  getPlans() {
    return this.promotionBoostsService.getPlans();
  }

  @Get('public')
  listPublicApproved(@Query('placement') placement?: string) {
    return this.promotionBoostsService.listPublicApproved(placement);
  }

  @Post()
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(
    @Body() body: CreatePromotionBoostRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.promotionBoostsService.create(req.user, body);
  }

  @Get('mine')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  listMine(@Req() req: AuthenticatedRequest) {
    return this.promotionBoostsService.listMine(req.user.sub);
  }

  @Get()
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  listForSuperAdmin() {
    return this.promotionBoostsService.listForSuperAdmin();
  }

  @Patch(':id/review')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  review(
    @Param('id') id: string,
    @Body() body: ReviewPromotionBoostRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.promotionBoostsService.review(id, req.user, body);
  }
}

