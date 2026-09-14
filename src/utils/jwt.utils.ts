import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";

export interface TokenPayload {
  accountNumber: string;
}

export const generateToken = (accountNumber: string): string => {
  return jwt.sign({ accountNumber }, JWT_SECRET, {
    expiresIn: "24h",
  });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};
