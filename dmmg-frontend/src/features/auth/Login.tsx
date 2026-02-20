import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      const res = await api.post("/auth/login", { email, password });
      const token = res.data?.accessToken;
      if (!token) throw new Error("Token missing in response");
      localStorage.setItem("token", token);
      nav("/dashboard");
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? e?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid place-items-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Login</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign in to manage meetings and generate minutes.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@org.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {msg && <div className="text-sm text-red-600">{msg}</div>}

          <Button className="w-full" onClick={onLogin} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>

          <div className="text-sm text-muted-foreground">
            No account?{" "}
            <button className="underline" onClick={() => nav("/auth/org")}>
              Create / Join org
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
