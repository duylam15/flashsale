import jwt from 'jsonwebtoken';
import config from '../../config/config';

const generateAccessToken = (
  userId: number,
  issuedAt?: number,
  expiresAt?: number
) => {
  const iat = issuedAt ?? Math.floor(Date.now() / 1000);

  const exp =
    expiresAt ??
    iat + config.jwt.accessExpirationMinutes * 60;

  const payload = {
    sub: userId,
    iat,
    exp,
    type: 'ACCESS',
  };

  return {
    token: jwt.sign(payload, config.jwt.secret),
    expires: new Date(exp * 1000),
  };
};

const generateAuthTokens = (userId: number) => {
  return {
    access: generateAccessToken(userId),
  };
};

export default {
  generateAuthTokens,
  generateAccessToken,
};