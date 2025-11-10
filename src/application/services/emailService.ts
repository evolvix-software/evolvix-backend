import nodemailer, { Transporter } from 'nodemailer';
import config from '../../config/env';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Check if email is configured
    const emailHost = process.env.EMAIL_HOST;
    const emailPort = process.env.EMAIL_PORT;
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;

    if (!emailHost || !emailPort || !emailUser || !emailPassword) {
      console.warn('⚠️  Email service not configured. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD in .env');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: emailHost,
        port: parseInt(emailPort, 10),
        secure: emailPort === '465', // true for 465, false for other ports
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
        // For Gmail, you might need:
        // service: 'gmail',
        // auth: {
        //   user: process.env.EMAIL_USER,
        //   pass: process.env.EMAIL_APP_PASSWORD, // Use App Password for Gmail
        // },
      });

      console.log('✅ Email service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.warn('⚠️  Email service not configured. Email not sent.');
      console.log('Email that would have been sent:', {
        to: options.to,
        subject: options.subject,
      });
      return false;
    }

    try {
      const mailOptions = {
        from: `"Evolvix" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    // Use first origin if multiple are configured, or the single origin
    const frontendOrigin = process.env.FRONTEND_URL || 
      (Array.isArray(config.corsOrigin) ? config.corsOrigin[0] : config.corsOrigin);
    const resetUrl = `${frontendOrigin}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 40px 20px; text-align: center;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #635bff 0%, #2563eb 100%); border-radius: 8px 8px 0 0;">
                      <div style="width: 48px; height: 48px; margin: 0 auto 16px; background-color: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <div style="width: 24px; height: 24px; background-color: white; border-radius: 50%;"></div>
                      </div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Evolvix</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">Reset Your Password</h2>
                      <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.6;">
                        We received a request to reset your password. Click the button below to create a new password.
                      </p>
                      
                      <!-- Button -->
                      <table role="presentation" style="margin: 32px 0;">
                        <tr>
                          <td style="text-align: center;">
                            <a href="${resetUrl}" 
                               style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #635bff 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 24px 0 0; color: #9ca3af; font-size: 14px; line-height: 1.5;">
                        If the button doesn't work, copy and paste this link into your browser:
                      </p>
                      <p style="margin: 8px 0 0; color: #635bff; font-size: 14px; word-break: break-all;">
                        <a href="${resetUrl}" style="color: #635bff; text-decoration: underline;">${resetUrl}</a>
                      </p>
                      
                      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 8px; color: #9ca3af; font-size: 12px;">
                          <strong>⚠️ Security Notice:</strong>
                        </p>
                        <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                          This link will expire in 10 minutes. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                      <p style="margin: 0; color: #6b7280; font-size: 14px;">
                        © ${new Date().getFullYear()} Evolvix. All rights reserved.
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

    return this.sendEmail({
      to: email,
      subject: 'Reset Your Password - Evolvix',
      html,
    });
  }

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Evolvix</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 40px 20px; text-align: center;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #635bff 0%, #2563eb 100%); border-radius: 8px 8px 0 0;">
                      <div style="width: 48px; height: 48px; margin: 0 auto 16px; background-color: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <div style="width: 24px; height: 24px; background-color: white; border-radius: 50%;"></div>
                      </div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Welcome to Evolvix!</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">Hello ${name},</h2>
                      <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.6;">
                        Thank you for joining Evolvix! We're excited to have you on board.
                      </p>
                      <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.6;">
                        Get started by completing your profile and exploring the platform.
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

    return this.sendEmail({
      to: email,
      subject: 'Welcome to Evolvix!',
      html,
    });
  }
}

// Export singleton instance
export default new EmailService();

