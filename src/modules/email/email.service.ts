import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface InvitationEmailData {
  recipientEmail: string;
  recipientName: string;
  inviterName: string;
  companyName: string;
  invitationToken: string;
  roleName: string;
  message?: string;
  expiresAt: Date;
}

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly frontendUrl: string;

  constructor(private configService: ConfigService) {
    this.fromEmail = this.configService.get<string>('MAIL_FROM_EMAIL') || 'noreply@finanx.com';
    this.fromName = this.configService.get<string>('MAIL_FROM_NAME') || 'FinanX';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';

    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('MAIL_HOST');
    const port = this.configService.get<number>('MAIL_PORT') || 587;
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASSWORD');

    if (!host || !user || !pass) {
      this.logger.warn('Email configuration incomplete. Email sending will be disabled.');
      this.logger.warn('Set MAIL_HOST, MAIL_USER, MAIL_PASSWORD in .env to enable emails.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    // Verify connection
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('Email transporter verification failed:', error);
      } else {
        this.logger.log('Email transporter is ready to send emails');
      }
    });
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`Email not sent (no transporter configured): ${options.subject} to ${options.to}`);
      return false;
    }

    try {
      const result = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      });

      this.logger.log(`Email sent successfully to ${options.to}, messageId: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  /**
   * Send user invitation email
   */
  async sendInvitationEmail(data: InvitationEmailData): Promise<boolean> {
    const invitationLink = `${this.frontendUrl}/accept-invitation?token=${data.invitationToken}`;
    const expiresFormatted = data.expiresAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = this.getInvitationEmailTemplate({
      recipientName: data.recipientName,
      inviterName: data.inviterName,
      companyName: data.companyName,
      roleName: data.roleName,
      invitationLink,
      message: data.message,
      expiresFormatted,
    });

    return this.sendEmail({
      to: data.recipientEmail,
      subject: `You're invited to join ${data.companyName} on FinanX`,
      html,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    name: string,
    resetToken: string,
  ): Promise<boolean> {
    const resetLink = `${this.frontendUrl}/reset-password?token=${resetToken}`;

    const html = this.getPasswordResetEmailTemplate({
      name,
      resetLink,
    });

    return this.sendEmail({
      to: email,
      subject: 'Reset Your FinanX Password',
      html,
    });
  }

  /**
   * Send welcome email after invitation accepted
   */
  async sendWelcomeEmail(
    email: string,
    name: string,
    companyName: string,
  ): Promise<boolean> {
    const loginLink = `${this.frontendUrl}/login`;

    const html = this.getWelcomeEmailTemplate({
      name,
      companyName,
      loginLink,
    });

    return this.sendEmail({
      to: email,
      subject: `Welcome to ${companyName} on FinanX!`,
      html,
    });
  }

  /**
   * Invitation email HTML template
   */
  private getInvitationEmailTemplate(data: {
    recipientName: string;
    inviterName: string;
    companyName: string;
    roleName: string;
    invitationLink: string;
    message?: string;
    expiresFormatted: string;
  }): string {
    const messageSection = data.message
      ? `
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #666; font-style: italic;">"${data.message}"</p>
          <p style="margin: 10px 0 0 0; color: #888; font-size: 14px;">- ${data.inviterName}</p>
        </div>
      `
      : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to FinanX</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #2563eb; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">FinanX</h1>
              <p style="margin: 10px 0 0 0; color: #93c5fd; font-size: 14px;">Smart Financial Management</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">You're Invited!</h2>

              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Hi <strong>${data.recipientName}</strong>,
              </p>

              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                <strong>${data.inviterName}</strong> has invited you to join <strong>${data.companyName}</strong> on FinanX as a <strong>${data.roleName}</strong>.
              </p>

              ${messageSection}

              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.invitationLink}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Accept Invitation
                </a>
              </div>

              <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 5px 0 20px 0; word-break: break-all;">
                <a href="${data.invitationLink}" style="color: #2563eb; font-size: 14px;">${data.invitationLink}</a>
              </p>

              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
                <p style="margin: 0; color: #9ca3af; font-size: 13px;">
                  This invitation expires on <strong>${data.expiresFormatted}</strong>.
                </p>
                <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 13px;">
                  If you didn't expect this invitation, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                &copy; ${new Date().getFullYear()} FinanX. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Password reset email HTML template
   */
  private getPasswordResetEmailTemplate(data: {
    name: string;
    resetLink: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #2563eb; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">FinanX</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">Reset Your Password</h2>

              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Hi <strong>${data.name}</strong>,
              </p>

              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.resetLink}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Reset Password
                </a>
              </div>

              <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px;">
                This link will expire in 1 hour.
              </p>
              <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
                If you didn't request this, please ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                &copy; ${new Date().getFullYear()} FinanX. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Welcome email HTML template
   */
  private getWelcomeEmailTemplate(data: {
    name: string;
    companyName: string;
    loginLink: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to FinanX</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #10b981; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Welcome!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">You're All Set!</h2>

              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Hi <strong>${data.name}</strong>,
              </p>

              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Welcome to <strong>${data.companyName}</strong> on FinanX! Your account has been successfully created.
              </p>

              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                You can now log in and start managing your finances.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.loginLink}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Go to Login
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                &copy; ${new Date().getFullYear()} FinanX. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check if email service is configured
   */
  isConfigured(): boolean {
    return !!this.transporter;
  }
}
