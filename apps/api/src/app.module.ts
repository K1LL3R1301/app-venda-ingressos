import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CheckinModule } from './checkin/checkin.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { OrdersModule } from './orders/orders.module';
import { OrganizersModule } from './organizers/organizers.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { SupportModule } from './support/support.module';
import { TicketsModule } from './tickets/tickets.module';
import { TicketTypesModule } from './ticket-types/ticket-types.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    OrganizersModule,
    EventsModule,
    TicketTypesModule,
    OrdersModule,
    TicketsModule,
    CheckinModule,
    PaymentsModule,
    DashboardModule,
    UsersModule,
    AuthModule,
    SupportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}