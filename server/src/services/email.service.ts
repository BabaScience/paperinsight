import 'reflect-metadata';
import { injectable } from 'inversify';
import { Resend } from 'resend';
import { env } from '../config/env.js';
import { TemplateRendererService } from './email/template-renderer.service.js';
import {
  VerificationEmail,
  VerificationSuccessEmail,
  TokenExtensionRequest,
  TokenExtensionApproved,
} from '../templates/email/index.js';
import type {
  VerificationEmailData,
  VerificationSuccessEmailData,
  TokenExtensionRequestEmailData,
  TokenExtensionApprovedEmailData,
} from './email/types.js';

@injectable()
export class EmailService {
  private resend: Resend | null = null;
  private templateRenderer: TemplateRendererService;

  constructor() {
    if (env.RESEND_API_KEY) {
      this.resend = new Resend(env.RESEND_API_KEY);
    }
    this.templateRenderer = new TemplateRendererService();
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
      const templateData: TokenExtensionRequestEmailData = {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        currentUsage,
        currentAllowance,
        message,
      };

      const html = this.templateRenderer.renderTemplate(TokenExtensionRequest, templateData);

      const { error } = await this.resend.emails.send({
        from: 'LUNAI <noreply@lunaiapp.com>',
        to: env.ADMIN_EMAIL,
        subject: `🔑 Token Extension Request from ${user.name}`,
        html,
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
      const templateData: TokenExtensionApprovedEmailData = {
        userName: user.name,
        userEmail: user.email,
        newAllowance,
        appUrl: env.FRONTEND_URL || 'https://lunaiapp.com',
      };

      const html = this.templateRenderer.renderTemplate(TokenExtensionApproved, templateData);

      const { error } = await this.resend.emails.send({
        from: 'LUNAI <noreply@lunaiapp.com>',
        to: user.email,
        subject: '✅ Your token extension request has been approved!',
        html,
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

  /**
   * Send email verification link to user
   */
  async sendVerificationEmail(
    user: { name: string; email: string },
    verificationToken: string,
    baseUrl: string = 'https://lunaiapp.com'
  ): Promise<boolean> {
    if (!this.resend) {
      console.warn('📧 Email service not configured. Verification email logged only.');
      console.log(`
        ========================================
        EMAIL VERIFICATION
        ========================================
        User: ${user.name} (${user.email})
        Verification Link: ${baseUrl}/verify-email?token=${verificationToken}
        ========================================
      `);
      return true;
    }

    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

    try {
      const templateData: VerificationEmailData = {
        userName: user.name,
        userEmail: user.email,
        verificationUrl,
        expiresInHours: 24,
      };

      const html = this.templateRenderer.renderTemplate(VerificationEmail, templateData);

      const { error } = await this.resend.emails.send({
        from: 'LUNAI <noreply@lunaiapp.com>',
        to: user.email,
        subject: 'Verify your email address - LUNAI',
        html,
      });

      if (error) {
        console.error('❌ Failed to send verification email:', error);
        return false;
      }

      console.log(`📧 Verification email sent to ${user.email}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending verification email:', error);
      return false;
    }
  }

  /**
   * Send email verification success notification
   */
  async sendVerificationSuccessEmail(
    user: { name: string; email: string }
  ): Promise<boolean> {
    if (!this.resend) {
      console.warn('📧 Email service not configured.');
      return true;
    }

    try {
      const templateData: VerificationSuccessEmailData = {
        userName: user.name,
        userEmail: user.email,
        loginUrl: `${env.FRONTEND_URL || 'https://lunaiapp.com'}/login`,
      };

      const html = this.templateRenderer.renderTemplate(VerificationSuccessEmail, templateData);

      const { error } = await this.resend.emails.send({
        from: 'LUNAI <noreply@lunaiapp.com>',
        to: user.email,
        subject: '✅ Email verified successfully - LUNAI',
        html,
      });

      if (error) {
        console.error('❌ Failed to send verification success email:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error sending verification success email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();

