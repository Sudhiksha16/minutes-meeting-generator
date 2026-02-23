import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { getSessionToken } from "@/lib/session";

type TokenPayload = {
  role: string;
  exp?: number;
};

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const token = getSessionToken();
  if (!token) return <Navigate to="/login" replace />;

  try {
    const decoded = jwtDecode<TokenPayload>(token);
    const role = decoded.role;

    // ✅ your schema roles
    const isAdmin = role === "ADMIN";
    if (!isAdmin) return <Navigate to="/dashboard" replace />;

    return <>{children}</>;
  } catch {
    return <Navigate to="/login" replace />;
  }
}
