import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'default_secret';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.cookies.token;
  
  if (!token) {
    res.status(401).json({ error: 'Unauthorized. Token missing.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, SECRET) as { userId: string };
    (req as any).user = { userId: decoded.userId };
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token.' });
    return;
  }
};
