import bcrypt from "bcrypt";
import { prisma } from "../utils/prisma";
import { signAccessToken } from "../utils/jwt";
import { isValidPassword } from "../utils/validation";

// 1) POST /auth/register/create-org
export async function createOrgAndAdmin(req: any, res: any) {
  try {
    const { orgName, category, name, email, password } = req.body;

    if (!orgName || !category || !name || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const existing = await prisma.user.findFirst({
      where: { email: cleanEmail },
    });

    if (existing) {
      return res.status(409).json({ message: "Email already exists" });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
      });
    }

    const org = await prisma.organization.create({
      data: {
        name: orgName,
        category,
        settings: {
          create: {
            adminOverrideEnabled: false,
            overrideReasonRequired: true,
          },
        },
        users: {
          create: {
            name,
            email: cleanEmail,
            passwordHash: await bcrypt.hash(password, 10),
            role: "ADMIN",
            status: "ACTIVE",
          },
        },
      },
      include: { users: true },
    });

    const admin = org.users[0];

    const token = signAccessToken({
      userId: admin.id,
      orgId: org.id,
      role: admin.role,
    });

    return res.status(201).json({
      message: "Organization created successfully",
      org: { id: org.id, name: org.name, category: org.category },
      user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
      accessToken: token,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
}

// 2) POST /auth/register/join-org
export async function joinOrg(req: any, res: any) {
  try {
    const { orgId, name, email, password, role } = req.body;

    if (!orgId || !name || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    if (!isValidPassword(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
      });
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return res.status(404).json({ message: "Organization not found" });

    const existing = await prisma.user.findFirst({
      where: { email: cleanEmail, orgId },
    });

    if (existing) {
      return res.status(409).json({ message: "User already exists in this organization" });
    }

    const user = await prisma.user.create({
      data: {
        orgId,
        name,
        email: cleanEmail,
        passwordHash: await bcrypt.hash(password, 10),
        role: role || "EMPLOYEE",
        status: "PENDING",
      },
    });

    return res.status(201).json({
      message: "Join request submitted. Waiting for admin approval.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
}

// 3) POST /auth/forgot-password
export async function forgotPassword(req: any, res: any) {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: "Email and newPassword are required" });
    }

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const users = await prisma.user.findMany({
      where: { email: cleanEmail },
      select: { id: true },
    });

    if (users.length === 0) {
      return res.status(404).json({ message: "Account not found for this email" });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    await prisma.user.updateMany({
      where: { email: cleanEmail },
      data: { passwordHash },
    });

    return res.json({ message: "Password reset successful. Please login with your new password." });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
}

// 4) POST /auth/login
export async function login(req: any, res: any) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const rawPassword = String(password); // don't trim password

    // ✅ fetch all users for this email (email not unique in schema)
    const users = await prisma.user.findMany({
      where: { email: cleanEmail },
      include: { organization: true },
      orderBy: { createdAt: "desc" },
    });

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid credentials (email not found)" });
    }

    for (const user of users) {
      // skip broken rows
      if (!user.passwordHash) continue;

      const passwordMatch = await bcrypt.compare(rawPassword, user.passwordHash);
      if (!passwordMatch) continue;

      // password matched -> now check status
      if (user.status !== "ACTIVE") {
        return res
          .status(403)
          .json({ message: `Account status: ${user.status}. Contact admin.` });
      }

      // ✅ avoid crash if relation broken
      if (!user.organization) {
        // this should not happen normally, but protects your frontend from blank screen
        return res.status(500).json({ message: "User organization relation missing" });
      }

      const token = signAccessToken({
        userId: user.id,
        orgId: user.orgId,
        role: user.role,
      });

      return res.json({
        message: "Login success",
        accessToken: token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          orgId: user.orgId,
        },
        org: {
          id: user.organization.id,
          name: user.organization.name,
          category: user.organization.category,
        },
      });
    }

    // none matched password
    return res.status(401).json({ message: "Invalid credentials (password mismatch)" });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
}
