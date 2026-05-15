import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  CreateCouponDto,
  CreatePromoterDto,
  CreatePromoterLinkDto,
  CreatePromoterSaleDto,
  MarkPromoterCommissionPaidDto,
  SetCommercialStatusDto,
} from './dto/promoters.dto';
import { PromotersService } from './promoters.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    email: string;
    role: string;
    name?: string;
  };
};

@ApiTags('Promoters & Coupons')
@Controller('promoters')
export class PromotersController {
  constructor(private readonly promotersService: PromotersService) {}

  @Get('overview')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  overview(@Req() req: AuthenticatedRequest) {
    return this.promotersService.overview(req.user);
  }

  @Get()
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  listPromoters(@Req() req: AuthenticatedRequest) {
    return this.promotersService.listPromoters(req.user);
  }

  @Post()
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createPromoter(@Body() body: CreatePromoterDto, @Req() req: AuthenticatedRequest) {
    return this.promotersService.createPromoter(req.user, body);
  }

  @Post(':id/status')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  setPromoterStatus(@Param('id') id: string, @Body() body: SetCommercialStatusDto, @Req() req: AuthenticatedRequest) {
    return this.promotersService.setPromoterStatus(req.user, id, body);
  }

  @Post(':id/commission/mark-paid')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  markCommissionPaid(@Param('id') id: string, @Body() body: MarkPromoterCommissionPaidDto, @Req() req: AuthenticatedRequest) {
    return this.promotersService.markCommissionPaid(req.user, id, body);
  }

  @Get('coupons')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  listCoupons(@Req() req: AuthenticatedRequest) {
    return this.promotersService.listCoupons(req.user);
  }

  @Post('coupons')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createCoupon(@Body() body: CreateCouponDto, @Req() req: AuthenticatedRequest) {
    return this.promotersService.createCoupon(req.user, body);
  }

  @Post('coupons/:id/status')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  setCouponStatus(@Param('id') id: string, @Body() body: SetCommercialStatusDto, @Req() req: AuthenticatedRequest) {
    return this.promotersService.setCouponStatus(req.user, id, body);
  }

  @Get('links')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  listLinks(@Req() req: AuthenticatedRequest) {
    return this.promotersService.listLinks(req.user);
  }

  @Post('links')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createLink(@Body() body: CreatePromoterLinkDto, @Req() req: AuthenticatedRequest) {
    return this.promotersService.createLink(req.user, body);
  }

  @Post('links/:slug/click')
  registerClick(@Param('slug') slug: string) {
    return this.promotersService.registerClick(slug);
  }

  @Get('sales')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  listSales(@Req() req: AuthenticatedRequest) {
    return this.promotersService.listSales(req.user);
  }

  @Post('sales/manual')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createManualSale(@Body() body: CreatePromoterSaleDto, @Req() req: AuthenticatedRequest) {
    return this.promotersService.createManualSale(req.user, body);
  }

  @Get('reports')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  reports(@Req() req: AuthenticatedRequest) {
    return this.promotersService.reports(req.user);
  }
}
