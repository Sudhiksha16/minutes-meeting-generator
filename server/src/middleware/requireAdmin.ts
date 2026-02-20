import { Role } from "@prisma/client";

export function requireAdmin(req: any, res: any, next: any) {
  const role = req.user?.role;

  if (role !== Role.ADMIN && role !== Role.HEAD) {
    return res.status(403).json({ message: "Access denied" });
  }

  next();
}
