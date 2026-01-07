import React from 'react';
import { BaseEmailTemplate } from '../base/BaseEmailTemplate.js';
import type { WelcomeEmailData } from '../../../services/email/types.js';

/**
 * Welcome email template
 * Sent when user registers for the first time
 */
export function WelcomeEmail({ userName, loginUrl, appUrl }: WelcomeEmailData) {
  return (
    <BaseEmailTemplate
      title={`Welcome to LUNAI, ${userName}! 🎉`}
      previewText="Welcome to LUNAI! We're excited to have you join us."
      primaryAction={{
        label: 'Get Started',
        url: loginUrl,
      }}
      footerText="If you have any questions, feel free to reach out to our support team."
    >
      <p style={{ margin: '0 0 16px 0' }}>
        Hi {userName},
      </p>

      <p style={{ margin: '0 0 16px 0' }}>
        Welcome to LUNAI! We're thrilled to have you join our community of researchers and academics.
      </p>

      <p style={{ margin: '0 0 24px 0' }}>
        LUNAI helps you analyze research papers, extract insights, and understand complex academic content with the power of AI. Here's what you can do:
      </p>

      <div
        style={{
          backgroundColor: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '20px',
          margin: '24px 0',
        }}
      >
        <h3
          style={{
            margin: '0 0 16px 0',
            color: '#0f172a',
            fontSize: '18px',
            fontWeight: '600',
          }}
        >
          Getting Started
        </h3>
        <ul
          style={{
            margin: '0',
            paddingLeft: '20px',
            color: '#475569',
            fontSize: '14px',
            lineHeight: '24px',
          }}
        >
          <li style={{ marginBottom: '8px' }}>
            <strong>Upload Papers:</strong> Upload PDF research papers to your library
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Ask Questions:</strong> Get instant answers about any paper's content
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Extract Insights:</strong> Generate summaries, key findings, and analysis
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Complete Your Profile:</strong> Personalize your experience by setting your research field and preferences
          </li>
        </ul>
      </div>

      <p style={{ margin: '24px 0 16px 0' }}>
        Before you can start using LUNAI, please verify your email address. Check your inbox for a verification email and click the link to activate your account.
      </p>

      <div
        style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #3b82f6',
          borderRadius: '8px',
          padding: '16px',
          margin: '24px 0',
        }}
      >
        <p
          style={{
            margin: '0',
            color: '#1e40af',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          💡 Tip
        </p>
        <p
          style={{
            margin: '8px 0 0 0',
            color: '#1e3a8a',
            fontSize: '14px',
          }}
        >
          Complete your profile to get personalized recommendations and better analysis results tailored to your research interests.
        </p>
      </div>

      <p style={{ margin: '24px 0 0 0' }}>
        We're here to help you make the most of your research. If you have any questions or need assistance, don't hesitate to reach out!
      </p>
    </BaseEmailTemplate>
  );
}


