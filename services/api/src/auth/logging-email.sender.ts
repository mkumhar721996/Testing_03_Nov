import { Injectable, Logger } from '@nestjs/common';
import type { EmailSender } from './email.sender';

/**
 * Development adapter: writes the reset link to the server log instead of sending mail. In
 * production the link is a live account-takeover secret, so only the fact of the request is logged.
 */
@Injectable()
export class LoggingEmailSender implements EmailSender {
  private readonly logger = new Logger(LoggingEmailSender.name);

  async sendPasswordReset(to: { email: string; name: string }, link: string): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      this.logger.warn(`Password reset requested for ${to.email}; no email provider is configured, nothing was sent`);
      return;
    }
    this.logger.log(`Password reset link for ${to.email}: ${link}`);
  }
}
