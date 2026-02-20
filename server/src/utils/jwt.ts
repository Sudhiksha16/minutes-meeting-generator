import jwt from "jsonwebtoken";

export function signAccessToken(payload: object) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET not found in .env");
  }

  return jwt.sign(payload, secret, {
    expiresIn: "7d", // 🔥 changed from 1h
  });
}
