import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OperatorAssignmentsController } from './operator-assignments.controller';
import { OperatorAssignmentsService } from './operator-assignments.service';

@Module({
  imports: [PrismaModule],
  controllers: [OperatorAssignmentsController],
  providers: [OperatorAssignmentsService],
})
export class OperatorAssignmentsModule {}
