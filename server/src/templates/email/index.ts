/**
 * Email templates index
 * Export all email templates and types for easy importing
 */

// Base template
export { BaseEmailTemplate } from './base/BaseEmailTemplate.js';
export type { BaseEmailTemplateProps } from './base/types.js';

// Verification templates
export { VerificationEmail } from './verification/VerificationEmail.js';
export { VerificationSuccessEmail } from './verification/VerificationSuccessEmail.js';

// Token templates
export { TokenExtensionRequest } from './token/TokenExtensionRequest.js';
export { TokenExtensionApproved } from './token/TokenExtensionApproved.js';

// Email data types
export type {
  VerificationEmailData,
  VerificationSuccessEmailData,
  TokenExtensionRequestEmailData,
  TokenExtensionApprovedEmailData,
} from '../../services/email/types.js';

