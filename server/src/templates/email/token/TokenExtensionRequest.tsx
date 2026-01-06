import React from 'react';
import { BaseEmailTemplate } from '../base/BaseEmailTemplate.js';
import type { TokenExtensionRequestEmailData } from '../../../services/email/types.js';

/**
 * Token extension request email template
 * Sent to admin when a user requests token extension
 */
export function TokenExtensionRequest({
  userName,
  userEmail,
  userId,
  currentUsage,
  currentAllowance,
  message,
}: TokenExtensionRequestEmailData) {
  const usagePercentage = ((currentUsage / currentAllowance) * 100).toFixed(1);

  return (
    <BaseEmailTemplate
      title={`Token Extension Request from ${userName}`}
      previewText={`User ${userName} has requested a token extension. Current usage: ${usagePercentage}%`}
    >
      <div
        style={{
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          padding: '20px',
          margin: '0 0 20px 0',
        }}
      >
        <h3
          style={{
            margin: '0 0 12px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: '#374151',
          }}
        >
          User Details
        </h3>
        <p style={{ margin: '4px 0', fontSize: '14px', color: '#475569' }}>
          <strong>Name:</strong> {userName}
        </p>
        <p style={{ margin: '4px 0', fontSize: '14px', color: '#475569' }}>
          <strong>Email:</strong> {userEmail}
        </p>
        <p style={{ margin: '4px 0', fontSize: '14px', color: '#475569' }}>
          <strong>User ID:</strong>{' '}
          <code
            style={{
              backgroundColor: '#e2e8f0',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '12px',
              fontFamily: 'monospace',
            }}
          >
            {userId}
          </code>
        </p>
      </div>

      <div
        style={{
          backgroundColor: '#fef3c7',
          borderRadius: '8px',
          padding: '20px',
          margin: '0 0 20px 0',
        }}
      >
        <h3
          style={{
            margin: '0 0 12px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: '#92400e',
          }}
        >
          Token Usage
        </h3>
        <p style={{ margin: '4px 0', fontSize: '14px', color: '#78350f' }}>
          <strong>Current Usage:</strong> {currentUsage.toLocaleString()} tokens
        </p>
        <p style={{ margin: '4px 0', fontSize: '14px', color: '#78350f' }}>
          <strong>Current Allowance:</strong> {currentAllowance.toLocaleString()} tokens
        </p>
        <p style={{ margin: '4px 0', fontSize: '14px', color: '#78350f' }}>
          <strong>Usage:</strong> {usagePercentage}%
        </p>
      </div>

      {message && (
        <div
          style={{
            backgroundColor: '#e5e7eb',
            borderRadius: '8px',
            padding: '20px',
            margin: '0 0 20px 0',
          }}
        >
          <h3
            style={{
              margin: '0 0 12px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#374151',
            }}
          >
            User's Message
          </h3>
          <p
            style={{
              margin: '0',
              fontSize: '14px',
              color: '#475569',
              whiteSpace: 'pre-wrap',
            }}
          >
            {message}
          </p>
        </div>
      )}

      <div
        style={{
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <p
          style={{
            margin: '0',
            fontSize: '14px',
            color: '#94a3b8',
          }}
        >
          To extend this user's token allowance, update their <code>tokenUsage.allowance</code> in the database.
        </p>
      </div>
    </BaseEmailTemplate>
  );
}

