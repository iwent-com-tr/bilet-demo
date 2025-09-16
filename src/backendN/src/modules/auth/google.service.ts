// src/modules/auth/google.service.ts
import { prisma } from '../../lib/prisma';
import { signAccess, signRefresh } from '../../lib/jwt';
import { hashPassword } from '../../lib/crypto';
import { makePkcePair } from '../../lib/pkce';
import { jwtVerify, createRemoteJWKSet } from 'jose';

export interface GoogleUser {
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  id_token: string;
  token_type: string;
}

export class GoogleOAuthService {
  private static readonly GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  private static readonly GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
  private static readonly GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

  static generatePKCE() {
    return makePkcePair();
  }

  static getGoogleAuthUrl(state: string, redirectUri: string, codeChallenge: string): string {
    console.log('GOOGLE_SERVICE: Building auth URL with redirectUri:', redirectUri);
    console.log('GOOGLE_SERVICE: Using code challenge:', codeChallenge.substring(0, 10) + '...');

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: state,
      nonce: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      access_type: 'offline',
      prompt: 'consent'
    });

    const authUrl = `${this.GOOGLE_AUTH_URL}?${params.toString()}`;
    console.log('GOOGLE_SERVICE: Generated auth URL:', authUrl);

    return authUrl;
  }

  static async exchangeCode(code: string, codeVerifier: string, redirectUri: string): Promise<TokenResponse> {
    console.log('🔄 GOOGLE_SERVICE: Token exchange with redirectUri:', redirectUri);
    console.log('🔐 GOOGLE_SERVICE: Using code verifier:', codeVerifier.substring(0, 10) + '...');

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code: code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    });

    const response = await fetch(this.GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ GOOGLE_SERVICE: Token exchange failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Google token exchange failed: ${response.status} ${errorText}`);
    }

    return await response.json();
  }

  static async verifyIdToken(idToken: string): Promise<GoogleUser> {
    try {
      // Create JWK Set from Google's public keys
      const jwks = createRemoteJWKSet(new URL(this.GOOGLE_CERTS_URL));

      // Verify JWT and get payload
      const { payload } = await jwtVerify(idToken, jwks, {
        issuer: 'https://accounts.google.com',
        audience: process.env.GOOGLE_CLIENT_ID
      });

      // Verify expiration manually (jose should handle this, but double-check)
      if (payload.exp && payload.exp < Date.now() / 1000) {
        throw new Error('Token has expired');
      }

      return payload as unknown as GoogleUser;
    } catch (error) {
      throw new Error(`Invalid Google ID token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async findOrCreateUser(googleUser: GoogleUser): Promise<any> {
    // Check if user exists by Google ID
    let user = await prisma.user.findUnique({
      where: { googleId: googleUser.sub }
    });

    if (user) {
      // Update last login
      user = await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });
      return user;
    }

    // Check if user exists by email
    const existingUser = await prisma.user.findUnique({
      where: { email: googleUser.email }
    });

    if (existingUser) {
      if (existingUser.googleId) {
        // Email exists but different Google account
        throw new Error('Bu e-posta adresi farklı bir Google hesabı ile zaten kayıtlı');
      }

      // Link Google account to existing user
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          googleId: googleUser.sub,
          emailVerified: true,
          avatar: googleUser.picture || existingUser.avatar,
          lastLogin: new Date()
        }
      });
      return user;
    }

    // Create new user
    const defaultPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const hashedPassword = await hashPassword(defaultPassword);

    // Parse name for firstName/lastName
    const nameParts = googleUser.name.split(' ');
    const firstName = nameParts[0] || 'Google';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    user = await prisma.user.create({
      data: {
        googleId: googleUser.sub,
        firstName: firstName,
        lastName: lastName,
        email: googleUser.email,
        emailVerified: googleUser.email_verified,
        password: hashedPassword, // Random password for Google users
        birthYear: new Date().getFullYear() - 25, // Default age
        phone: `+90${Math.random().toString().slice(2, 11)}`, // Random phone for now
        phoneVerified: false,
        avatar: googleUser.picture,
        city: 'İstanbul', // Default city
        userType: 'USER',
        adminRole: 'USER',
        points: 0,
        locale: googleUser.locale || 'tr-TR'
      }
    });

    return user;
  }

  static async authenticateWithGoogle(code: string, codeVerifier: string, redirectUri: string) {
    // Exchange code for tokens
    const tokenResponse = await this.exchangeCode(code, codeVerifier, redirectUri);

    // Verify and decode ID token
    const googleUser = await this.verifyIdToken(tokenResponse.id_token);

    // Find or create user
    const user = await this.findOrCreateUser(googleUser);

    // Generate JWT tokens
    const accessToken = signAccess({ sub: user.id, userType: user.userType });
    const refreshToken = signRefresh({ sub: user.id });

    return {
      user,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900 // 15 minutes
      },
      googleTokens: {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresIn: tokenResponse.expires_in
      }
    };
  }

  static async refreshGoogleToken(refreshToken: string) {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    const response = await fetch(this.GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Google token');
    }

    return await response.json();
  }
}
