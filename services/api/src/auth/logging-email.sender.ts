import { Injectable, Logger } from '@nestjs/common';
import type { EmailSender } from './email.sender';

/** Development adapter: writes the reset link to the server log instead of sending mail. */
@Injectable()
export class LoggingEmailSender implements EmailSender {
  private readonly logger = new Logger(LoggingEmailSender.name);

  async sendPasswordReset(to: { email: string; name: string }, link: string): Promise<void> {
    this.logger.log(`Password reset link for ${to.email}: ${link}`);
  }
}
