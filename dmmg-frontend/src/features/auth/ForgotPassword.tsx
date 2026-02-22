import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
};

export default function ForgotPassword() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onResetPassword() {
    if (newPassword !== confirmPassword) {
      setMsg("Confirm password does not match.");
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      const res = await api.post("/auth/forgot-password", {
        email: email.trim(),
        newPassword,
      });
      setMsg(res.data?.message ?? "Password updated successfully.");
    } catch (e: unknown) {
      const err = e as ApiError;
      setMsg(err?.response?.data?.message ?? err?.message ?? "Password reset failed");
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
          <div className="text-3xl font-semibold tracking-tight">Reset Password</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Set a new password to access your account.
          </p>
        </div>

        <Card className="rounded-2xl border-white/30 bg-background/90 shadow-xl backdrop-blur">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Forgot Password</CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter your account email and set a new password.
            </p>
          </CardHeader>

          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@org.com"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Must include uppercase, lowercase, number, special character (8+ chars).
              </p>
            </div>

            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-xl"
              />
            </div>

            {msg && (
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-foreground">
                {msg}
              </div>
            )}

            <Button className="w-full rounded-xl" onClick={onResetPassword} disabled={loading}>
              {loading ? "Updating..." : "Reset Password"}
            </Button>

            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => nav("/")}
              disabled={loading}
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
