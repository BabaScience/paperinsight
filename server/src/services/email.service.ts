import { Resend } from 'resend';
import { env } from '../config/env.js';

class EmailService {
  private resend: Resend | null = null;

  constructor() {
    if (env.RESEND_API_KEY) {
      this.resend = new Resend(env.RESEND_API_KEY);
    }
  }

  /**
   * Send token extension request email to admin
   */
  async sendTokenExtensionRequest(
    user: { id: string; name: string; email: string },
    currentUsage: number,
    currentAllowance: number,
    message?: string
  ): Promise<boolean> {
    if (!this.resend || !env.ADMIN_EMAIL) {
      console.warn('📧 Email service not configured. Token request logged only.');
      console.log(`
        ========================================
        TOKEN EXTENSION REQUEST
        ========================================
        User: ${user.name} (${user.email})
        User ID: ${user.id}
        Current Usage: ${currentUsage.toLocaleString()} tokens
        Current Allowance: ${currentAllowance.toLocaleString()} tokens
        Message: ${message || 'No message provided'}
        ========================================
      `);
      return true;
    }

    try {
      const { error } = await this.resend.emails.send({
        from: 'PaperInsight <noreply@paperinsight.app>',
        to: env.ADMIN_EMAIL,
        subject: `🔑 Token Extension Request from ${user.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6366f1;">Token Extension Request</h2>
            
            <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">User Details</h3>
              <p><strong>Name:</strong> ${user.name}</p>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>User ID:</strong> <code>${user.id}</code></p>
            </div>
            
            <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #92400e;">Token Usage</h3>
              <p><strong>Current Usage:</strong> ${currentUsage.toLocaleString()} tokens</p>
              <p><strong>Current Allowance:</strong> ${currentAllowance.toLocaleString()} tokens</p>
              <p><strong>Usage:</strong> ${((currentUsage / currentAllowance) * 100).toFixed(1)}%</p>
            </div>
            
            ${message ? `
            <div style="background: #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">User's Message</h3>
              <p style="white-space: pre-wrap;">${message}</p>
            </div>
            ` : ''}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px;">
                To extend this user's token allowance, update their <code>tokenUsage.allowance</code> in the database.
              </p>
            </div>
          </div>
        `,
      });

      if (error) {
        console.error('❌ Failed to send token request email:', error);
        return false;
      }

      console.log(`📧 Token extension request email sent for user ${user.email}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending token request email:', error);
      return false;
    }
  }

  /**
   * Send token extension approved notification to user
   */
  async sendTokenExtensionApproved(
    user: { name: string; email: string },
    newAllowance: number
  ): Promise<boolean> {
    if (!this.resend) {
      console.warn('📧 Email service not configured.');
      return true;
    }

    try {
      const { error } = await this.resend.emails.send({
        from: 'PaperInsight <noreply@paperinsight.app>',
        to: user.email,
        subject: '✅ Your token extension request has been approved!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #10b981;">Good news, ${user.name}!</h2>
            
            <p>Your token extension request has been approved.</p>
            
            <div style="background: #d1fae5; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #065f46;">New Token Allowance</h3>
              <p style="font-size: 24px; font-weight: bold; color: #059669;">
                ${newAllowance.toLocaleString()} tokens
              </p>
            </div>
            
            <p>You can now continue using PaperInsight to analyze your research papers.</p>
            
            <div style="margin-top: 30px;">
              <a href="https://paperinsight.app" 
                 style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                Go to PaperInsight
              </a>
            </div>
          </div>
        `,
      });

      if (error) {
        console.error('❌ Failed to send approval email:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error sending approval email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();

