// src/modules/auth/google.controller.ts
import { Request, Response, NextFunction } from 'express';
import { GoogleOAuthService } from './google.service';
import { GoogleAuthStartDTO, GoogleAuthCallbackDTO, GoogleAuthRefreshDTO } from './auth.dto';
import { sanitizeUser } from './auth.controller';
import { getGoogleRedirectUrl, getGoogleConfig, validateGoogleConfig } from '../../lib/google-oauth-config';

// In-memory store for PKCE verifiers (in production, use Redis or database)
const pkceStore = new Map<string, { verifier: string; challenge: string; redirectUri: string; expiresAt: number }>();

function humanizeGoogleError(e: any) {
  const code = e?.code || e?.message;
  let humanMessage: string;

  switch (code) {
    case 'GOOGLE_AUTH_FAILED':
      humanMessage = 'Google ile giriş başarısız oldu'; break;
    case 'INVALID_GOOGLE_TOKEN':
      humanMessage = 'Geçersiz Google token'; break;
    case 'GOOGLE_USER_EXISTS':
      humanMessage = 'Bu e-posta farklı bir Google hesabı ile zaten kayıtlı'; break;
    case 'GOOGLE_TOKEN_EXPIRED':
      humanMessage = 'Google oturum süresi doldu'; break;
    default:
      humanMessage = e.message || 'Google ile giriş sırasında bir hata oluştu';
      break;
  }

  const newError: any = new Error(humanMessage);
  newError.status = e.status || 500;
  newError.code = e.code || 'GOOGLE_AUTH_ERROR';
  return newError;
}

export const startGoogleAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = GoogleAuthStartDTO.parse(req.body);

    // Validate Google OAuth configuration
    const validation = validateGoogleConfig();
    if (!validation.isValid) {
      console.error('❌ Google OAuth configuration errors:', validation.errors);
      const err: any = new Error('Google OAuth yapılandırması hatalı: ' + validation.errors.join(', '));
      err.status = 500;
      err.code = 'GOOGLE_CONFIG_ERROR';
      throw err;
    }

    const googleConfig = getGoogleConfig();

    console.log('🔍 BACKEND: GOOGLE_OAUTH_START_DEBUG:', {
      googleConfig,
      input_redirectUri: input.redirectUri,
      req_protocol: req.protocol,
      req_host: req.get('host'),
      req_origin: req.get('origin')
    });

    // Generate state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Use the utility function to get the correct redirect URI
    const redirectUri = googleConfig.redirectUrl;

    console.log('🎯 BACKEND: Final redirectUri for Google:', redirectUri);

    console.log('BACKEND: Final redirectUri used:', redirectUri);

    // Generate PKCE challenge and store verifier
    const { verifier, challenge } = GoogleOAuthService.generatePKCE();
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

    console.log('🔐 BACKEND: Generated PKCE pair:', {
      verifierLength: verifier.length,
      challengeLength: challenge.length,
      challenge: challenge.substring(0, 10) + '...'
    });

    pkceStore.set(state, {
      verifier,
      challenge,
      redirectUri,
      expiresAt
    });

    // Clean up expired entries
    for (const [key, value] of pkceStore.entries()) {
      if (value.expiresAt < Date.now()) {
        pkceStore.delete(key);
      }
    }

    // Generate Google OAuth URL with the stored challenge
    const authUrl = GoogleOAuthService.getGoogleAuthUrl(state, redirectUri, challenge);

    res.json({
      authUrl,
      state,
      redirectUri
    });
  } catch (e) {
    next(humanizeGoogleError(e));
  }
};

export const googleAuthCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('🎯 BACKEND: GOOGLE_CALLBACK_DEBUG:', {
      originalUrl: req.originalUrl,
      query: req.query,
      headers: {
        host: req.headers.host,
        origin: req.headers.origin,
        referer: req.headers.referer
      }
    });
    console.log('BACKEND: PKCE Store size:', pkceStore.size);

    const input = GoogleAuthCallbackDTO.parse(req.query);
    console.log('BACKEND: DTO parsed successfully:', { code: input.code.substring(0, 10) + '...', state: input.state });

    // Validate state and get stored verifier
    const storedData = pkceStore.get(input.state);
    console.log('🔍 BACKEND: Stored data for state:', input.state, !!storedData);
    if (storedData) {
      console.log('🔐 BACKEND: PKCE verification:', {
        verifierLength: storedData.verifier?.length,
        challengeLength: storedData.challenge?.length,
        challenge: storedData.challenge?.substring(0, 10) + '...',
        redirectUri: storedData.redirectUri
      });
    }

    if (!storedData) {
      const err: any = new Error('Geçersiz veya süresi dolmuş oturum');
      err.status = 400; err.code = 'INVALID_STATE';
      throw err;
    }

    // Check if state has expired
    if (storedData.expiresAt < Date.now()) {
      pkceStore.delete(input.state);
      const err: any = new Error('Oturum süresi doldu');
      err.status = 400; err.code = 'STATE_EXPIRED';
      throw err;
    }

    // Clean up used state
    pkceStore.delete(input.state);

    // Use the utility function to get the correct redirect URI
    const googleConfig = getGoogleConfig();
    const redirectUri = googleConfig.redirectUrl;

    console.log('🔄 BACKEND: Token exchange with redirectUri:', redirectUri);

    // Authenticate with Google
    const { user, tokens, googleTokens } = await GoogleOAuthService.authenticateWithGoogle(
      input.code,
      storedData.verifier,
      redirectUri
    );

    console.log('✅ BACKEND: Google authentication successful for user:', {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    });

    // Store Google refresh token in user's social account if available
    if (googleTokens.refreshToken) {
      await updateUserSocialAccount(user.id, googleTokens.refreshToken);
    }

    // Determine frontend URL based on environment
    const isDevelopment = process.env.NODE_ENV === 'development';
    const frontendUrl = isDevelopment 
      ? 'http://localhost:5173'  // Vite default port
      : process.env.FRONTEND_URL || 'https://iwent.com.tr';

    console.log('🏠 BACKEND: Determined frontend URL:', frontendUrl);

    // Create a URL-encoded JSON object containing user data and tokens
    const userData = {
      user: sanitizeUser(user),
      tokens,
      googleTokens: {
        accessToken: googleTokens.accessToken,
        expiresIn: googleTokens.expiresIn
      }
    };

    console.log('📦 BACKEND: Prepared user data for frontend:', {
      hasUser: !!userData.user,
      hasTokens: !!userData.tokens,
      hasGoogleTokens: !!userData.googleTokens
    });

    // Convert to base64 for URL transmission
    const userDataEncoded = Buffer.from(JSON.stringify(userData)).toString('base64');
    console.log('🔐 BACKEND: Encoded user data length:', userDataEncoded.length);

    // Redirect to frontend with user data in URL hash
    // For HashRouter, the URL should be: http://localhost:5173/#/auth/callback#auth=ENCODED_DATA
    const redirectUrl = `${frontendUrl}/#/auth/callback#auth=${encodeURIComponent(userDataEncoded)}`;
    
    console.log('🎯 BACKEND: Redirecting to frontend with URL:', redirectUrl);
    res.redirect(302, redirectUrl);
  } catch (e) {
    console.error('❌ BACKEND: Google OAuth callback error:', e);
    next(humanizeGoogleError(e));
  }
};

export const refreshGoogleToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = GoogleAuthRefreshDTO.parse(req.body);

    const newTokens = await GoogleOAuthService.refreshGoogleToken(input.refreshToken);

    res.json({
      accessToken: newTokens.access_token,
      expiresIn: newTokens.expires_in,
      tokenType: 'Bearer'
    });
  } catch (e) {
    next(humanizeGoogleError(e));
  }
};

// Helper function to update user's Google social account
async function updateUserSocialAccount(userId: string, refreshToken: string) {
  try {
    const { prisma } = await import('../../lib/prisma');

    await prisma.userSocialAccount.upsert({
      where: {
        userId_provider: {
          userId: userId,
          provider: 'google'
        }
      },
      update: {
        refreshToken: refreshToken,
        connected: true,
        updatedAt: new Date()
      },
      create: {
        userId: userId,
        provider: 'google',
        refreshToken: refreshToken,
        connected: true
      }
    });
  } catch (error) {
    // Log error but don't fail the auth flow
    console.error('Failed to update Google social account:', error);
  }
}
