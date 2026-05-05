import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly fromEmail: string;
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(configService.getOrThrow<string>('RESEND_API_KEY'));
    this.fromEmail = configService.getOrThrow<string>('RESEND_FROM_EMAIL');
    this.apiUrl = configService.getOrThrow<string>('API_GATEWAY_PUBLIC_URL');
  }

  async sendActivationMail(to: string, activationLink: string): Promise<void> {
    const url = `${this.apiUrl}/auth/activate/${activationLink}`;

    await this.resend.emails.send({
      from: this.fromEmail,
      to,
      subject: 'Activate your account',
      html: `
        <p>Thanks for signing up!</p>
        <p>Click the link below to activate your account:</p>
        <a href="${url}">${url}</a>
        <p>The link does not expire.</p>
      `,
    });
  }
}
