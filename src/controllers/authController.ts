import { RefreshToken } from './../generated/prisma-client/client';
import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcrypt';
import crypto from 'crypto'
import { signAccessToken, refreshTokenExpiryDate } from '../utils/jwt';
import { promisify } from 'util';

import jwt from 'jsonwebtoken';


const randomBytes = promisify(crypto.randomBytes);
const REFRESH_TOKEN_BYTES = 48; // bytes for token entropy
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);

function splitRefreshToken(token: string): { id: string; raw: string } | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  // token format: "<id>.<raw>" (raw can itself contain dots if you prefer hex it's safe)
  const id = parts[0];
  const raw = parts.slice(1).join('.');
  return { id, raw };
}
/**
 * Signup
 * POST /api/auth/signup
 * body: { email, password, name? }
 */
export const signup = async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'email and password required' });

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { email, passwordHash, name: name ?? null }
    });

    // safe response (no password hash)
    return res.status(201).json({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    console.error('signup error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};


/**
 * Login
 * POST /api/auth/login
 * body: { email, password, tenantIdOrSlug? }
 *
 * If tenantIdOrSlug provided, the response access token will include tenantId and tenantRole.
 */

export const login = async (req: Request, res: Response) => {
  const { email, password, tenantIdOrSlug } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'email and password required' });

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenantMemberships: true } // to lookup tenant roles if requested
    });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    // // Determine tenant context if requested
    // let tenantId: string | undefined;
    // let tenantRole: string | undefined;
    // if (tenantIdOrSlug) {
    //   // accept either id or slug
    //   const tenant =
    //     (await prisma.tenant.findUnique({ where: { id: tenantIdOrSlug } })) ??
    //     (await prisma.tenant.findUnique({ where: { slug: String(tenantIdOrSlug).toLowerCase().trim() } }));

    //   if (tenant) {
    //     tenantId = tenant.id;
    //     // find membership
    //     const membership = user.tenantMemberships.find((m) => m.tenantId === tenant.id);
    //     if (membership) tenantRole = membership.role;
    //   } else {
    //     // Option: we could reject if tenant not found; for now we ignore tenant context if not found
    //     tenantId = undefined;
    //   }
    // }

    // create access token
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      // tenantId,
      // tenantRole
    });

    // create refresh token (random token string) and store hashed in DB
    const raw = (await randomBytes(REFRESH_TOKEN_BYTES)).toString('hex'); // raw token to return to client
    const tokenHash = await bcrypt.hash(raw, BCRYPT_SALT_ROUNDS);
    const expiresAt = refreshTokenExpiryDate();

    const created = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });
    const combined = `${created.id}.${raw}`;
    return res.json({
      accessToken,
      refreshToken: combined,
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN ?? '15m'
    });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 * body: { refreshToken, tenantIdOrSlug? }
 *
 * We verify the incoming refresh token by comparing a bcrypt hash with DB stored tokenHash.
 * We rotate refresh tokens (optional): here we create a new refresh token and delete the old one.
 */

export const refresh = async (req: Request, res: Response) => {
  const { refreshToken, tenantIdOrSlug } = req.body
  if (!refreshToken) return res.status(400).json({ message: 'refreshToken Required' })
  const parsed = splitRefreshToken(refreshToken);
  if (!parsed) return res.status(400).json({ message: 'Invalid refresh token format' });
  const { id: tokenId, raw } = parsed;
  const tokenRow = await prisma.refreshToken.findUnique({
    where: { id: tokenId }
  });
  if (!tokenRow || tokenRow.revoked || tokenRow.expiresAt <= new Date()) {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }

  const ok = await bcrypt.compare(raw, tokenRow.tokenHash);
  if (!ok) {

    return res.status(401).json({ message: 'Invalid refresh token' });
  }
  const user = await prisma.user.findUnique({
    where: { id: tokenRow.userId },
    include: { tenantMemberships: true }
  });
  if (!user) return res.status(401).json({ message: 'Invalid refresh token' });
  const newAccessToken = signAccessToken({ sub: user.id, email: user.email });
  await prisma.refreshToken.update({
    where: { id: tokenId },
    data: { revoked: true }
  });
  const newRaw = (await randomBytes(REFRESH_TOKEN_BYTES)).toString('hex');
  const newHash = await bcrypt.hash(newRaw, BCRYPT_SALT_ROUNDS);
  const newExpiresAt = refreshTokenExpiryDate();

  const newRow = await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: newHash,
      expiresAt: newExpiresAt
    }
  });
  const combinedNew = `${newRow.id}.${newRaw}`;
  return res.json({
    accessToken: newAccessToken,
    refreshToken: combinedNew,
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN ?? '15m'
  });
}
/**
 * Logout (revoke refresh token)
 * POST /api/auth/logout
 * body: { refreshToken }
 */
export const logout = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });

  const parsed = splitRefreshToken(refreshToken);
  if (!parsed) return res.status(400).json({ message: 'Invalid refresh token format' });

  await prisma.refreshToken.updateMany({
    where: { id: parsed.id, revoked: false },
    data: { revoked: true }
  });

  return res.status(204).send();

};