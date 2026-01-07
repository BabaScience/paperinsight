import React from 'react';
import type { BaseEmailTemplateProps } from './types.js';

/**
 * Base email template component matching LUNAI app design
 * Uses email-safe HTML and inline styles for maximum compatibility
 */
export function BaseEmailTemplate({
  title,
  children,
  primaryAction,
  footerText,
  previewText,
}: BaseEmailTemplateProps) {
  // LUNAI brand colors matching app design
  const colors = {
    primary: '#6366f1', // indigo-500
    primaryDark: '#4f46e5', // indigo-600
    primaryLight: '#818cf8', // indigo-400
    background: '#f8fafc', // slate-50
    surface: '#ffffff',
    textPrimary: '#0f172a', // slate-900
    textSecondary: '#475569', // slate-600
    textMuted: '#94a3b8', // slate-400
    border: '#e2e8f0', // slate-200
    success: '#10b981', // emerald-500
    accentTeal: '#14b8a6', // teal-500
    accentViolet: '#8b5cf6', // violet-500
  };

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {previewText && <meta name="description" content={previewText} />}
        <title>{title}</title>
        {/* Email-safe font stack */}
        <style>{`
          @media only screen and (max-width: 600px) {
            .email-container {
              width: 100% !important;
            }
            .email-content {
              padding: 20px !important;
            }
          }
        `}</style>
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          backgroundColor: colors.background,
          color: colors.textPrimary,
          lineHeight: '1.6',
        }}
      >
        {/* Preview text (hidden but shown in email clients) */}
        {previewText && (
          <div style={{ display: 'none', fontSize: '1px', color: colors.background, lineHeight: '1px', maxHeight: '0px', maxWidth: '0px', opacity: 0, overflow: 'hidden' }}>
            {previewText}
          </div>
        )}

        {/* Email wrapper */}
        <table
          role="presentation"
          cellPadding="0"
          cellSpacing="0"
          border={0}
          width="100%"
          style={{
            backgroundColor: colors.background,
            padding: '20px 0',
          }}
        >
          <tr>
            <td align="center">
              {/* Main container */}
              <table
                role="presentation"
                cellPadding="0"
                cellSpacing="0"
                border={0}
                width="600"
                className="email-container"
                style={{
                  maxWidth: '600px',
                  width: '100%',
                  backgroundColor: colors.surface,
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
                }}
              >
                {/* Header */}
                <tr>
                  <td
                    className="email-content"
                    style={{
                      padding: '32px 40px 24px',
                      textAlign: 'center',
                      borderBottom: `1px solid ${colors.border}`,
                    }}
                  >
                    {/* Logo/Brand */}
                    <div style={{ marginBottom: '8px' }}>
                      <span
                        style={{
                          fontSize: '28px',
                          fontWeight: '700',
                          letterSpacing: '-0.02em',
                          color: colors.primary,
                        }}
                      >
                        LUNA
                        <span style={{ color: colors.primaryDark }}>i</span>
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        color: colors.textMuted,
                        fontWeight: '500',
                      }}
                    >
                      AI-Powered Research Analysis
                    </div>
                  </td>
                </tr>

                {/* Content */}
                <tr>
                  <td
                    className="email-content"
                    style={{
                      padding: '32px 40px',
                    }}
                  >
                    {/* Title */}
                    <h1
                      style={{
                        fontSize: '24px',
                        fontWeight: '700',
                        color: colors.textPrimary,
                        margin: '0 0 16px 0',
                        lineHeight: '1.3',
                      }}
                    >
                      {title}
                    </h1>

                    {/* Main content */}
                    <div
                      style={{
                        fontSize: '16px',
                        color: colors.textSecondary,
                        lineHeight: '1.6',
                      }}
                    >
                      {children}
                    </div>

                    {/* Primary action button */}
                    {primaryAction && (
                      <div
                        style={{
                          marginTop: '32px',
                          textAlign: 'center',
                        }}
                      >
                        <a
                          href={primaryAction.url}
                          style={{
                            display: 'inline-block',
                            backgroundColor: colors.primary,
                            color: '#ffffff',
                            padding: '14px 28px',
                            textDecoration: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '16px',
                            boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.25)',
                          }}
                        >
                          {primaryAction.label}
                        </a>
                      </div>
                    )}
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td
                    className="email-content"
                    style={{
                      padding: '24px 40px 32px',
                      textAlign: 'center',
                      borderTop: `1px solid ${colors.border}`,
                      backgroundColor: colors.background,
                    }}
                  >
                    {footerText && (
                      <p
                        style={{
                          fontSize: '14px',
                          color: colors.textMuted,
                          margin: '0 0 12px 0',
                          lineHeight: '1.5',
                        }}
                      >
                        {footerText}
                      </p>
                    )}
                    <p
                      style={{
                        fontSize: '12px',
                        color: colors.textMuted,
                        margin: '0',
                        lineHeight: '1.5',
                      }}
                    >
                      © {new Date().getFullYear()} LUNAI. All rights reserved.
                    </p>
                    <p
                      style={{
                        fontSize: '12px',
                        color: colors.textMuted,
                        margin: '12px 0 0 0',
                        lineHeight: '1.5',
                      }}
                    >
                      <a
                        href="https://lunaiapp.com"
                        style={{
                          color: colors.primary,
                          textDecoration: 'none',
                        }}
                      >
                        Visit LUNAI
                      </a>
                      {' • '}
                      <a
                        href="https://lunaiapp.com/support"
                        style={{
                          color: colors.primary,
                          textDecoration: 'none',
                        }}
                      >
                        Support
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}


