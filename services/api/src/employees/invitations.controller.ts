import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { InvitationService } from './invitation.service';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationService) {}

  @Post('accept')
  @HttpCode(200)
  accept(@Body() body: { token?: string }): Promise<{ employeeId: string }> {
    return this.invitations.accept(body?.token as string);
  }
}
