import jwt from 'jsonwebtoken';
import config from '../../config/config';

const generateAuthTokens = (userId: number) => {
  // Payload của Token (theo chuẩn cấu hình passport của bạn)
  const accessTokenExpires =
    Math.floor(Date.now() / 1000) + config.jwt.accessExpirationMinutes * 60;

  const payload = {
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: accessTokenExpires,
    type: 'ACCESS'
  };

  const accessToken = jwt.sign(payload, config.jwt.secret);

  return {
    access: {
      token: accessToken,
      expires: new Date(accessTokenExpires * 1000)
    }
  };
};

export default {
  generateAuthTokens
};
