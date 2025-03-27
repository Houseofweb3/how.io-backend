import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';

import { User } from '../entity';
import { ENV } from '../config/env';
import { AppDataSource } from '../config/data-source';
import { ExtendedRequest, ExtendedResponse } from '../types';

export class AuthController {
  private userRepository = AppDataSource.getRepository(User);

  public register = async (req: ExtendedRequest, res: ExtendedResponse): Promise<ExtendedResponse> => {
    const { name, email, password } = req.body;

    try {
      const existingUser = await this.userRepository.findOneBy({ email });
      if (existingUser) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: ReasonPhrases.BAD_REQUEST });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = this.userRepository.create({ name, email, password: hashedPassword });
      await this.userRepository.save(user);

      const token = jwt.sign({ userId: user.id }, ENV.JWT_SECRET, { expiresIn: '1h' });

      return res.status(StatusCodes.CREATED).json({ token });
    } catch (error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: ReasonPhrases.INTERNAL_SERVER_ERROR });
    }
  };

  public login = async (req: ExtendedRequest, res: ExtendedResponse): Promise<ExtendedResponse> => {
    const { email, password } = req.body;

    try {
      const user = await this.userRepository.findOneBy({ email });
      if (!user) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: ReasonPhrases.BAD_REQUEST });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: ReasonPhrases.BAD_REQUEST });
      }

      const token = jwt.sign({ userId: user.id }, ENV.JWT_SECRET, { expiresIn: '1h' });

      return res.status(200).json({ token });
    } catch (error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: ReasonPhrases.INTERNAL_SERVER_ERROR });
    }
  };
  
  public getCurrentUser = async (req: ExtendedRequest, res: ExtendedResponse): Promise<ExtendedResponse> => {
    try {
      const user = await this.userRepository.findOneBy({ id: req.user });
      if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: ReasonPhrases.NOT_FOUND });
      }
      return res.status(200).json(user);
    } catch (error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: ReasonPhrases.INTERNAL_SERVER_ERROR });
    }
  };
}
