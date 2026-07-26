import nodemailer from 'nodemailer';

export class EmailService {
  // Configured for Brevo SMTP
  private static transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.BREVO_SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.BREVO_SMTP_USER, // Your Brevo SMTP Login
      pass: process.env.BREVO_SMTP_PASS, // Your Brevo SMTP Master Password
    },
  });

  /**
   * Send a general notification email
   */
  static async sendNotification(to: string, subject: string, htmlContent: string) {
    try {
      const mailOptions = {
        from: '"Prepia" <noreply@Prepia.com>', // MUST be verified in Brevo
        to,
        subject,
        html: htmlContent,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('[EmailService] Email sent successfully:', info.messageId);
      return info;
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error);
      throw error;
    }
  }
}
