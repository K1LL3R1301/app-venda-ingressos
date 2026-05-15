import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { DashboardService } from './dashboard.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    email: string;
    role: string;
    cpf?: string;
  };
};

@ApiTags('Dashboard')
@ApiBearerAuth('bearer')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}


  @Get('summary/admin-scope')
  @Roles('ADMIN', 'SUPER_ADMIN')
  getAdminScopeSummary(@Req() req: AuthenticatedRequest) {
    return this.dashboardService.getAdminScopeSummary(req.user);
  }

  @Get('summary')
  @Roles('ADMIN')
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('operator')
  @Roles('ADMIN', 'OPERATOR')
  getOperatorSummary() {
    return this.dashboardService.getOperatorSummary();
  }
}