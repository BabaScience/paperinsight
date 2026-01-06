import React from 'react';
import { BaseEmailTemplate } from '../base/BaseEmailTemplate.js';
import type { TokenExtensionApprovedEmailData } from '../../../services/email/types.js';

/**
 * Token extension approved email template
 * Sent to user when their token extension request is approved
 */
export function TokenExtensionApproved({ userName, newAllowance, appUrl }: TokenExtensionApprovedEmailData) {
  return (
    <BaseEmailTemplate
      title={`Good news, ${userName}!`}
      previewText="Your token extension request has been approved"
      primaryAction={{
        label: 'Go to LUNAI',
        url: appUrl,
      }}
    >
      <p style={{ margin: '0 0 24px 0' }}>
        Your token extension request has been approved. You can now continue using LUNAI to analyze your research papers.
      </p>

      <div
        style={{
          backgroundColor: '#d1fae5',
          borderRadius: '8px',
          padding: '24px',
          margin: '24px 0',
          textAlign: 'center',
        }}
      >
        <h3
          style={{
            margin: '0 0 8px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: '#065f46',
          }}
        >
          New Token Allowance
        </h3>
        <p
          style={{
            margin: '0',
            fontSize: '32px',
            fontWeight: '700',
            color: '#059669',
          }}
        >
          {newAllowance.toLocaleString()} tokens
        </p>
      </div>

      <p style={{ margin: '24px 0 0 0', fontSize: '14px', color: '#475569' }}>
        Your account has been updated with the new token allowance. Start analyzing your papers now!
      </p>
    </BaseEmailTemplate>
  );
}

