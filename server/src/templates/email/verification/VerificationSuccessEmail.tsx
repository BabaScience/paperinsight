import React from 'react';
import { BaseEmailTemplate } from '../base/BaseEmailTemplate.js';
import type { VerificationSuccessEmailData } from '../../../services/email/types.js';

/**
 * Email verification success template
 * Sent after user successfully verifies their email
 */
export function VerificationSuccessEmail({ userName, loginUrl }: VerificationSuccessEmailData) {
  return (
    <BaseEmailTemplate
      title="Email Verified Successfully!"
      previewText="Your email address has been verified. You can now access all features of LUNAI."
      primaryAction={{
        label: 'Sign In to LUNAI',
        url: loginUrl,
      }}
      footerText="If you didn't verify your email, please contact our support team immediately."
    >
      <p style={{ margin: '0 0 16px 0' }}>
        Hi {userName},
      </p>

      <p style={{ margin: '0 0 24px 0' }}>
        Your email address has been verified successfully. You can now access all features of LUNAI and start analyzing your research papers.
      </p>

      <div
        style={{
          backgroundColor: '#d1fae5',
          border: '1px solid #10b981',
          borderRadius: '8px',
          padding: '16px',
          margin: '24px 0',
        }}
      >
        <p
          style={{
            margin: '0',
            color: '#065f46',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          ✓ Verification Complete
        </p>
        <p
          style={{
            margin: '8px 0 0 0',
            color: '#047857',
            fontSize: '14px',
          }}
        >
          Your account is now fully activated and ready to use.
        </p>
      </div>
    </BaseEmailTemplate>
  );
}

