import  jwt from 'jsonwebtoken';
const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET ?? 'dev-secret';
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN ?? '15m'; // e.g. '15m'
const REFRESH_TOKEN_EXPIRES_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 30);

export type AccessTokenPayload = {
  sub: string;           // userId
  email?: string;
  tenantId?: string;     // optional tenant context
  tenantRole?: string;   // optional role (OWNER|ADMIN|MEMBER)
  iat?: number;
  exp?: number;
};
export function signAccessToken(payload: Omit<AccessTokenPayload, 'iat' | 'exp'>) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyAccessToken(token:string):AccessTokenPayload{
    return jwt.verify(token , JWT_SECRET) as AccessTokenPayload
}

export function refreshTokenExpiryDate(): Date {
  const now = new Date();
  now.setDate(now.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);
  return now;
}
