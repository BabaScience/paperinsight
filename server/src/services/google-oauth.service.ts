import 'reflect-metadata';
import { injectable } from 'inversify';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import crypto from 'crypto';

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

@injectable()
export class GoogleOAuthService {
  private oauth2Client: OAuth2Client | null = null;
  private redirectUri: string = '';

  constructor() {
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
      // Construct redirect URI - use env var or construct from PORT
      // IMPORTANT: Redirect URI must be the BACKEND URL, not frontend
      if (env.GOOGLE_REDIRECT_URI) {
        this.redirectUri = env.GOOGLE_REDIRECT_URI;
      } else {
        // Default to backend URL based on PORT
        // In production, use API_URL env var or construct from FRONTEND_URL
        if (env.NODE_ENV === 'production') {
          if (env.API_URL) {
            const apiUrl = new URL(env.API_URL);
            this.redirectUri = `${apiUrl.protocol}//${apiUrl.host}/api/auth/google/callback`;
            console.log(`   Using API_URL from env: ${env.API_URL}`);
          } else if (env.FRONTEND_URL) {
            // If FRONTEND_URL is set, assume API is at api subdomain
            const frontendUrl = new URL(env.FRONTEND_URL);
            let apiHost: string;
            
            if (frontendUrl.host.startsWith('www.')) {
              apiHost = frontendUrl.host.replace('www.', 'api.');
            } else {
              apiHost = `api.${frontendUrl.host}`;
            }
            
            this.redirectUri = `${frontendUrl.protocol}//${apiHost}/api/auth/google/callback`;
            console.log(`   Constructed from FRONTEND_URL: ${env.FRONTEND_URL} -> ${this.redirectUri}`);
          } else {
            // Fallback: use https with PORT (unlikely in production)
            this.redirectUri = `https://localhost:${env.PORT}/api/auth/google/callback`;
            console.log(`   Using fallback with PORT: ${env.PORT}`);
          }
        } else {
          // Development: use localhost
          const host = env.API_URL ? new URL(env.API_URL).host : `localhost:${env.PORT}`;
          this.redirectUri = `http://${host}/api/auth/google/callback`;
        }
      }
      
      console.log(`🔐 Google OAuth Configuration:`);
      console.log(`   Client ID: ${env.GOOGLE_CLIENT_ID.substring(0, 20)}...`);
      console.log(`   Redirect URI: ${this.redirectUri}`);
      console.log(`   ⚠️  Make sure this redirect URI is added in Google Cloud Console!`);
      
      this.oauth2Client = new OAuth2Client(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        this.redirectUri
      );
    } else {
      console.warn('⚠️  Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable.');
    }
  }

  /**
   * Generate Google OAuth authorization URL
   * @param state Optional state parameter for CSRF protection
   * @returns Authorization URL
   */
  getAuthUrl(state?: string): string {
    if (!this.oauth2Client) {
      throw new Error('Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
    }

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent screen to get refresh token
      state: state || crypto.randomBytes(32).toString('hex'),
    });

    console.log(`🔗 Generated Google OAuth URL with redirect URI: ${this.redirectUri}`);
    return authUrl;
  }

  /**
   * Exchange authorization code for access tokens
   * @param code Authorization code from Google callback
   * @returns Token response
   */
  async getTokens(code: string): Promise<TokenResponse> {
    if (!this.oauth2Client) {
      throw new Error('Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
    }

    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      if (!tokens.access_token || !tokens.id_token) {
        throw new Error('Failed to get tokens from Google');
      }

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || undefined,
        id_token: tokens.id_token,
        expires_in: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
        scope: tokens.scope || '',
        token_type: 'Bearer',
      };
    } catch (error: any) {
      console.error('Error exchanging code for tokens:', error);
      
      // Provide more helpful error messages
      if (error?.response?.data?.error === 'invalid_client') {
        const errorDesc = error?.response?.data?.error_description || 'Unauthorized';
        throw new Error(
          `Google OAuth authentication failed: ${errorDesc}\n\n` +
          `Possible causes:\n` +
          `1. Client Secret is incorrect - verify GOOGLE_CLIENT_SECRET matches Google Cloud Console\n` +
          `2. Redirect URI mismatch - ensure "${this.redirectUri}" is added to Authorized redirect URIs in Google Cloud Console\n` +
          `3. Client ID/Secret mismatch - verify they belong to the same OAuth 2.0 Client ID\n\n` +
          `To fix:\n` +
          `- Go to Google Cloud Console → APIs & Services → Credentials\n` +
          `- Open your OAuth 2.0 Client ID\n` +
          `- Under "Authorized redirect URIs", add: ${this.redirectUri}\n` +
          `- Verify Client ID and Client Secret match your .env file`
        );
      }
      
      throw new Error(`Failed to exchange authorization code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user information from Google using access token
   * @param accessToken Google access token
   * @returns User information
   */
  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Google API error: ${response.statusText}`);
      }

      const data = await response.json() as {
        id: string;
        email: string;
        name: string;
        picture?: string;
        verified_email?: boolean;
      };

      return {
        id: data.id,
        email: data.email,
        name: data.name,
        picture: data.picture,
        email_verified: data.verified_email || false,
      };
    } catch (error) {
      console.error('Error fetching user info from Google:', error);
      throw new Error(`Failed to get user info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify Google ID token and get user information
   * @param idToken Google ID token
   * @returns User information
   */
  async verifyIdToken(idToken: string): Promise<GoogleUserInfo> {
    if (!this.oauth2Client) {
      throw new Error('Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
    }

    try {
      const ticket = await this.oauth2Client.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID || undefined,
      });

      const payload = ticket.getPayload();
      
      if (!payload) {
        throw new Error('Invalid ID token payload');
      }

      return {
        id: payload.sub || '',
        email: payload.email || '',
        name: payload.name || '',
        picture: payload.picture,
        email_verified: payload.email_verified || false,
      };
    } catch (error) {
      console.error('Error verifying ID token:', error);
      throw new Error(`Failed to verify ID token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if Google OAuth is configured
   */
  isConfigured(): boolean {
    return this.oauth2Client !== null;
  }
}

