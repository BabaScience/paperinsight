/**
 * Email data types for type-safe email templates
 */

export interface VerificationEmailData {
  userName: string;
  userEmail: string;
  verificationUrl: string;
  expiresInHours: number;
}

export interface VerificationSuccessEmailData {
  userName: string;
  userEmail: string;
  loginUrl: string;
}

export interface TokenExtensionRequestEmailData {
  userId: string;
  userName: string;
  userEmail: string;
  currentUsage: number;
  currentAllowance: number;
  message?: string;
}

export interface TokenExtensionApprovedEmailData {
  userName: string;
  userEmail: string;
  newAllowance: number;
  appUrl: string;
}

