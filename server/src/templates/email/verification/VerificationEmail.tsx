import React from 'react';
import { BaseEmailTemplate } from '../base/BaseEmailTemplate.js';
import type { VerificationEmailData } from '../../../services/email/types.js';

/**
 * Email verification template
 * Sent when user registers to verify their email address
 */
export function VerificationEmail({ userName, verificationUrl, expiresInHours }: VerificationEmailData) {
  return (
    <BaseEmailTemplate
      title={`Welcome to LUNAI, ${userName}!`}
      previewText="Please verify your email address to complete your registration"
      primaryAction={{
        label: 'Verify Email Address',
        url: verificationUrl,
      }}
      footerText={`This link will expire in ${expiresInHours} hours. If you didn't create an account with LUNAI, you can safely ignore this email.`}
    >
      <p style={{ margin: '0 0 16px 0' }}>
        Thank you for signing up! Please verify your email address to complete your registration and start using LUNAI.
      </p>

      <p style={{ margin: '0 0 24px 0' }}>
        Click the button above to verify your email address. If the button doesn't work, copy and paste this link into your browser:
      </p>

      <p style={{ margin: '0', wordBreak: 'break-all' }}>
        <a
          href={verificationUrl}
          style={{
            color: '#6366f1',
            textDecoration: 'underline',
            fontSize: '14px',
          }}
        >
          {verificationUrl}
        </a>
      </p>
    </BaseEmailTemplate>
  );
}

