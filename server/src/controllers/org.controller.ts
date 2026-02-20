import { prisma } from "../utils/prisma";
import { UserStatus, Role } from "@prisma/client";

/**
 * Helper: check admin-like roles
 */
function isOrgAdmin(role?: Role) {
  return role === Role.ADMIN || role === Role.HEAD;
}

/**
 * GET /orgs/public
 */
export async function listPublicOrgs(req: any, res: any) {
  try {
    const orgs = await prisma.organization.findMany({
      select: { id: true, name: true, category: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.json({ orgs });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
}

/**
 * POST /orgs/:orgId/join
 * Existing logged-in user requests to join another org:
 * status becomes PENDING, orgId becomes requested orgId
 */
export async function joinOrg(req: any, res: any) {
  try {
    const userId = req.user?.id;
    const orgId = req.params.orgId;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!orgId) return res.status(400).json({ message: "orgId is required" });

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return res.status(404).json({ message: "Organization not found" });

    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, orgId: true, status: true },
    });

    if (!me) return res.status(404).json({ message: "User not found" });

    // If already ACTIVE in some org, block switching
    if (me.status === UserStatus.ACTIVE && me.orgId) {
      return res.status(400).json({
        message: "You are already an active member in an organization.",
      });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        orgId,
        status: UserStatus.PENDING,
      },
      select: { id: true, name: true, email: true, role: true, status: true, orgId: true },
    });

    return res.json({
      message: "Request sent. Wait for admin approval.",
      user: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
}

/**
 * GET /orgs/:orgId/pending
 * Admin/Head/CEO fetches pending members of that org
 */
export async function getPendingMembers(req: any, res: any) {
  try {
    const orgId = req.params.orgId;
    if (!orgId) return res.status(400).json({ message: "orgId is required" });

    // ✅ Role guard (optional but recommended)
    const myRole: Role | undefined = req.user?.role;
    const myOrgId: string | undefined = req.user?.orgId;

    if (!isOrgAdmin(myRole)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (myOrgId !== orgId) {
      return res.status(403).json({ message: "Forbidden: wrong organization" });
    }

    const users = await prisma.user.findMany({
      where: { orgId, status: UserStatus.PENDING },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ users });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
}

/**
 * PATCH /orgs/:orgId/approve/:userId
 * Approve => status ACTIVE
 */
export async function approveMember(req: any, res: any) {
  try {
    const { orgId, userId } = req.params;

    if (!orgId || !userId) {
      return res.status(400).json({ message: "orgId and userId are required" });
    }

    // ✅ Role guard
    const myRole: Role | undefined = req.user?.role;
    const myOrgId: string | undefined = req.user?.orgId;

    if (!isOrgAdmin(myRole)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (myOrgId !== orgId) {
      return res.status(403).json({ message: "Forbidden: wrong organization" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, orgId: true, status: true },
    });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.orgId !== orgId) {
      return res.status(400).json({ message: "User does not belong to this org" });
    }

    // ✅ only allow approving pending users
    if (user.status !== UserStatus.PENDING) {
      return res.status(400).json({ message: `Cannot approve user with status ${user.status}` });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE },
      select: { id: true, name: true, email: true, role: true, status: true, orgId: true },
    });

    return res.json({ message: "Approved", user: updated });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
}

/**
 * PATCH /orgs/:orgId/reject/:userId
 * Reject => status REJECTED
 */
export async function rejectMember(req: any, res: any) {
  try {
    const { orgId, userId } = req.params;

    if (!orgId || !userId) {
      return res.status(400).json({ message: "orgId and userId are required" });
    }

    // ✅ Role guard
    const myRole: Role | undefined = req.user?.role;
    const myOrgId: string | undefined = req.user?.orgId;

    if (!isOrgAdmin(myRole)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (myOrgId !== orgId) {
      return res.status(403).json({ message: "Forbidden: wrong organization" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, orgId: true, status: true },
    });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.orgId !== orgId) {
      return res.status(400).json({ message: "User does not belong to this org" });
    }

    // ✅ only allow rejecting pending users
    if (user.status !== UserStatus.PENDING) {
      return res.status(400).json({ message: `Cannot reject user with status ${user.status}` });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.REJECTED },
      select: { id: true, name: true, email: true, role: true, status: true, orgId: true },
    });

    return res.json({ message: "Rejected", user: updated });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
}