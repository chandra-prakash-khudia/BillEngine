import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import prisma from '../lib/prisma';


declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        email?: string;
        tenantId?: string;
        tenantRole?: string;
      };
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ message: 'Missing Authorization header' });
    const parts = header.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ message: 'Invalid Authorization header' });

    const token = parts[1];
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }


    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ message: 'User no longer exists' });

    // Attach auth info to req
    req.auth = {
      userId: payload.sub,
      email: payload.email,
    //   tenantId: payload.tenantId,
    //   tenantRole: payload.tenantRole
    };

    return next();
  } catch (err) {
    console.error('requireAuth error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};