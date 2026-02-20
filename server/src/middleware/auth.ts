import jwt from "jsonwebtoken";

export function requireAuth(req: any, res: any, next: any) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing Bearer token" });
  }

  const token = header.split(" ")[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) return res.status(500).json({ message: "JWT_SECRET missing in .env" });

  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid/expired token" });
  }
}
