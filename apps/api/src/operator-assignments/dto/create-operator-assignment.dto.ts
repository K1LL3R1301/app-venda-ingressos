export class CreateOperatorAssignmentDto {
  cpf!: string;
  eventId!: string;
  notes?: string;
  canValidateTickets?: boolean;
  canAnswerSupport?: boolean;
}
