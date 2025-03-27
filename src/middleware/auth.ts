import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';

import { ENV } from '../config/env';

interface JwtPayload {
  userId: number;
}

export const auth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: ReasonPhrases.UNAUTHORIZED });
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
    req.user = decoded.userId;
    next();
  } catch (err) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: ReasonPhrases.UNAUTHORIZED });
  }
};
