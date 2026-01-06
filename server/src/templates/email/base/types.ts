/**
 * Base email template types
 */

export interface BaseEmailTemplateProps {
  title: string;
  children: React.ReactNode;
  primaryAction?: {
    label: string;
    url: string;
  };
  footerText?: string;
  previewText?: string;
}

