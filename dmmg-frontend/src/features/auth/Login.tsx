import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { saveSessionDetails } from "@/lib/session";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginResponse = {
  accessToken?: string;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
    orgId?: string | null;
  };
  org?: {
    id: string;
    name?: string | null;
    category?: string | null;
  };
};

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
};

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onLogin() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.post<LoginResponse>("/auth/login", { email, password });
      const token = res.data?.accessToken;
      if (!token) throw new Error("Token missing in response");

      saveSessionDetails({
        token,
        userName: res.data?.user?.name ?? null,
        userEmail: res.data?.user?.email ?? null,
        userRole: res.data?.user?.role ?? null,
        orgName: res.data?.org?.name ?? null,
      });

      nav("/dashboard", { replace: true });
    } catch (e: unknown) {
      const err = e as ApiError;
      setMsg(err?.response?.data?.message ?? err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-[calc(100vh-140px)] place-items-center overflow-hidden px-3 py-6 sm:px-4">
      <div className="pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-16 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" />

      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-3xl font-semibold tracking-tight">Login</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to manage meetings and generate minutes.
          </p>
        </div>

        <Card className="rounded-2xl border-white/30 bg-background/90 shadow-xl backdrop-blur">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Welcome back</CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter your details to continue.
            </p>
          </CardHeader>

          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@org.com"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Password</Label>
                <button
                  type="button"
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                  onClick={() => nav("/auth/forgot-password")}
                >
                  Forgot password?
                </button>
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl"
              />
            </div>

            {msg && (
              <div className="text-sm text-red-600 bg-red-50/40 border border-red-200 rounded-xl p-3">
                {msg}
              </div>
            )}

            <Button className="w-full rounded-xl" onClick={onLogin} disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>

            <div className="text-sm text-muted-foreground text-center">
              No account?{" "}
              <button className="underline underline-offset-4" onClick={() => nav("/auth/org")}>
                Create / Join org
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
