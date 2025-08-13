import bcrypt from 'bcryptjs';

function resolveSaltRounds(): number {
  const raw = process.env.BCRYPT_SALT_ROUNDS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  const rounds = Number.isFinite(parsed) ? parsed : 12;
  // Clamp to a reasonable range for performance/security balance
  return Math.min(Math.max(rounds, 4), 15);
}

export async function hashPassword(plainTextPassword: string): Promise<string> {
  if (typeof plainTextPassword !== 'string' || plainTextPassword.length === 0) {
    throw new Error('hashPassword requires a non-empty password string');
  }
  const saltRounds = resolveSaltRounds();
  return bcrypt.hash(plainTextPassword, saltRounds);
}

export async function verifyPassword(plainTextPassword: string, passwordHash: string): Promise<boolean> {
  if (typeof plainTextPassword !== 'string' || plainTextPassword.length === 0) {
    return false;
  }
  if (typeof passwordHash !== 'string' || passwordHash.length === 0) {
    return false;
  }
  try {
    return await bcrypt.compare(plainTextPassword, passwordHash);
  } catch {
    // In case of an invalid hash string format, do not throw; return false
    return false;
  }
}


