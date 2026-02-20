import { prisma } from "../utils/prisma";
import bcrypt from "bcrypt";
import { isValidPassword } from "../utils/validation";

export async function listPendingUsers(req: any, res: any) {
  try {
    const orgId = req.user.orgId;

    const users = await prisma.user.findMany({
      where: { orgId, status: "PENDING" },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    return res.json({ users });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
}

export async function approveUser(req: any, res: any) {
  try {
    const orgId = req.user.orgId;
    const userId = req.params.userId;

    const user = await prisma.user.findFirst({ where: { id: userId, orgId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: "ACTIVE" },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    return res.json({ message: "User approved", user: updated });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
}

export async function rejectUser(req: any, res: any) {
  try {
    const orgId = req.user.orgId;
    const userId = req.params.userId;

    const user = await prisma.user.findFirst({ where: { id: userId, orgId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: "REJECTED" },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    return res.json({ message: "User rejected", user: updated });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
}

export async function resetUserPassword(req: any, res: any) {
  try {
    const orgId = req.user.orgId;
    const userId = req.params.userId;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "newPassword is required" });
    }

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
      });
    }

    const user = await prisma.user.findFirst({ where: { id: userId, orgId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) },
    });

    return res.json({ message: "Password reset successful" });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
}