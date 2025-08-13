import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

type PrimitiveRecord = Record<string, string | number | boolean | null>;

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role?: string;
  // Allow extra custom claims if needed
  [key: string]: unknown;
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  [key: string]: unknown;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const ACCESS_SECRET = () => getRequiredEnv('JWT_ACCESS_SECRET');
const REFRESH_SECRET = () => getRequiredEnv('JWT_REFRESH_SECRET');

type ExpiresIn = NonNullable<SignOptions['expiresIn']>;

function resolveAccessExpiresIn(): ExpiresIn {
  const fromEnv = process.env.JWT_ACCESS_EXPIRES_IN;
  return (fromEnv ?? '15m') as ExpiresIn;
}

function resolveRefreshExpiresIn(): ExpiresIn {
  const fromEnv = process.env.JWT_REFRESH_EXPIRES_IN;
  return (fromEnv ?? '30d') as ExpiresIn;
}

export function signAccess(
  payload: AccessTokenPayload,
  options: SignOptions = {}
): string {
  if (!payload || typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new Error('signAccess requires a payload with a non-empty sub');
  }
  const signOptions: SignOptions = {
    expiresIn: resolveAccessExpiresIn(),
    ...options,
  };
  return jwt.sign(payload as PrimitiveRecord, ACCESS_SECRET(), signOptions);
}

export function signRefresh(
  payload: RefreshTokenPayload,
  options: SignOptions = {}
): string {
  if (!payload || typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new Error('signRefresh requires a payload with a non-empty sub');
  }
  const signOptions: SignOptions = {
    expiresIn: resolveRefreshExpiresIn(),
    ...options,
  };
  return jwt.sign(payload as PrimitiveRecord, REFRESH_SECRET(), signOptions);
}

export function verifyAccess(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET());
    if (typeof decoded === 'string') {
      throw new Error('invalid access token payload');
    }
    return decoded as AccessTokenPayload;
  } catch (err: unknown) {
    const error: any = err instanceof Error ? err : new Error('invalid access token');
    if ((error.name || '').includes('TokenExpiredError')) {
      error.code = 'TOKEN_EXPIRED';
      error.status = 401;
    } else {
      error.code = 'TOKEN_INVALID';
      error.status = 401;
    }
    throw error;
  }
}

export function verifyRefresh(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET());
    if (typeof decoded === 'string') {
      throw new Error('invalid refresh token payload');
    }
    return decoded as RefreshTokenPayload;
  } catch (err: unknown) {
    const error: any = err instanceof Error ? err : new Error('invalid refresh token');
    if ((error.name || '').includes('TokenExpiredError')) {
      error.code = 'TOKEN_EXPIRED';
      error.status = 401;
    } else {
      error.code = 'TOKEN_INVALID';
      error.status = 401;
    }
    throw error;
  }
}

export function decode(token: string): null | JwtPayload | string {
  return jwt.decode(token, { json: false });
}


