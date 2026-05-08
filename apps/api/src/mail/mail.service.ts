import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Resend } from 'resend'

@Injectable()
export class MailService {
  private readonly resend: Resend
  private readonly from: string
  private readonly storefrontUrl: string
  private readonly adminUrl: string
  private readonly logger = new Logger(MailService.name)

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'))
    this.from = this.config.get<string>('EMAIL_FROM') ?? 'noreply@swappa.com'
    this.storefrontUrl = this.config.get<string>('STOREFRONT_URL') ?? 'http://localhost:3000'
    this.adminUrl = this.config.get<string>('ADMIN_URL') ?? 'http://localhost:3001'
  }

  private baseTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Swappa</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F2EE;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F2EE;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
          <!-- Brand header -->
          <tr>
            <td align="center" style="padding:0 0 32px 0;">
              <span style="font-family:'Georgia',serif;font-size:13px;letter-spacing:0.25em;text-transform:uppercase;color:#0F0F0F;font-weight:600;">SWAPPA</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:#FFFFFF;border-radius:4px;padding:48px 48px 40px 48px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding:28px 0 0 0;">
              <p style="margin:0;font-size:12px;color:#8A8480;letter-spacing:0.02em;">
                &copy; ${new Date().getFullYear()} Swappa. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  }

  private ctaButton(href: string, label: string): string {
    return `
<table cellpadding="0" cellspacing="0" border="0" style="margin:32px 0;">
  <tr>
    <td align="center" bgcolor="#C9A96E" style="border-radius:3px;">
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;color:#FFFFFF;text-decoration:none;letter-spacing:0.08em;text-transform:uppercase;">${label}</a>
    </td>
  </tr>
</table>`
  }

  async sendVerificationEmail(email: string, firstName: string, token: string): Promise<void> {
    const link = `${this.storefrontUrl}/verify-email?token=${token}`

    const content = `
<h1 style="margin:0 0 8px 0;font-family:'Georgia',serif;font-size:26px;font-weight:400;color:#0F0F0F;letter-spacing:0.01em;">Verify your email</h1>
<p style="margin:0 0 24px 0;font-size:15px;color:#4A4540;line-height:1.6;">Hi ${firstName}, welcome to Swappa. Please verify your email address to complete your registration.</p>
${this.ctaButton(link, 'Verify Email')}
<p style="margin:24px 0 0 0;font-size:13px;color:#8A8480;line-height:1.6;">This link expires in 24 hours. If you did not create an account, you can safely ignore this email.</p>
<p style="margin:16px 0 0 0;font-size:12px;color:#B0AAA4;">Or copy this link: <a href="${link}" style="color:#C9A96E;text-decoration:none;">${link}</a></p>`

    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'Verify your Swappa account',
        html: this.baseTemplate(content),
      })
    } catch (err) {
      this.logger.error(`Failed to send verification email to ${email}`, err)
    }
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    token: string,
    isAdmin = false,
  ): Promise<void> {
    const baseUrl = isAdmin ? this.adminUrl : this.storefrontUrl
    const link = `${baseUrl}/reset-password?token=${token}`

    const content = `
<h1 style="margin:0 0 8px 0;font-family:'Georgia',serif;font-size:26px;font-weight:400;color:#0F0F0F;letter-spacing:0.01em;">Reset your password</h1>
<p style="margin:0 0 24px 0;font-size:15px;color:#4A4540;line-height:1.6;">Hi ${firstName}, we received a request to reset your password. Click the button below to choose a new one.</p>
${this.ctaButton(link, 'Reset Password')}
<p style="margin:24px 0 0 0;font-size:13px;color:#8A8480;line-height:1.6;">This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.</p>
<p style="margin:16px 0 0 0;font-size:12px;color:#B0AAA4;">Or copy this link: <a href="${link}" style="color:#C9A96E;text-decoration:none;">${link}</a></p>`

    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'Reset your Swappa password',
        html: this.baseTemplate(content),
      })
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${email}`, err)
    }
  }

  async sendAdminInviteEmail(email: string, inviterName: string, token: string): Promise<void> {
    const link = `${this.adminUrl}/accept-invite?token=${token}`

    const content = `
<h1 style="margin:0 0 8px 0;font-family:'Georgia',serif;font-size:26px;font-weight:400;color:#0F0F0F;letter-spacing:0.01em;">You've been invited</h1>
<p style="margin:0 0 24px 0;font-size:15px;color:#4A4540;line-height:1.6;">${inviterName} has invited you to join the Swappa admin panel. Click the button below to set up your account.</p>
${this.ctaButton(link, 'Accept Invitation')}
<p style="margin:24px 0 0 0;font-size:13px;color:#8A8480;line-height:1.6;">This invitation expires in 72 hours. If you were not expecting this invitation, you can safely ignore this email.</p>
<p style="margin:16px 0 0 0;font-size:12px;color:#B0AAA4;">Or copy this link: <a href="${link}" style="color:#C9A96E;text-decoration:none;">${link}</a></p>`

    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: `You've been invited to Swappa Admin`,
        html: this.baseTemplate(content),
      })
    } catch (err) {
      this.logger.error(`Failed to send admin invite email to ${email}`, err)
    }
  }
}
