import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

type TokenPayload = {
  role: string;
  exp?: number;
};

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;

  try {
    const decoded = jwtDecode<TokenPayload>(token);
    const role = decoded.role;

    // ✅ your schema roles
    const isAdmin = role === "ADMIN" || role === "HEAD"; // add MANAGER if needed
    if (!isAdmin) return <Navigate to="/dashboard" replace />;

    return <>{children}</>;
  } catch {
    return <Navigate to="/login" replace />;
  }
}