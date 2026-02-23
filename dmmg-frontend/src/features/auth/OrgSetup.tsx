import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { jwtDecode } from "jwt-decode";
import { saveSessionDetails } from "@/lib/session";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TokenPayload = {
  userId: string;
  orgId: string;
  role: string;
  iat?: number;
  exp?: number;
};

const CATEGORY_OPTIONS = [
  "IT",
  "Finance",
  "Healthcare",
  "Education",
  "Manufacturing",
  "Retail",
  "Government",
  "General",
  "Custom",
] as const;

type OrgPublic = { id: string; name: string; category?: string | null };
const ORG_JOIN_ROLE_OPTIONS = ["ADMIN", "CEO", "CHAIRMAN", "HR", "HEAD", "MANAGER", "EMPLOYEE"] as const;
const EDUCATION_JOIN_ROLE_OPTIONS = ["ADMIN", "FOUNDER", "CORESPONDANT", "FACULTY", "HEAD", "STUDENT"] as const;

function isEducationCategory(category?: string | null) {
  const value = String(category ?? "").trim().toLowerCase();
  return (
    value.includes("education") ||
    value.includes("school") ||
    value.includes("college") ||
    value.includes("university") ||
    value.includes("institution")
  );
}

export default function OrgSetup() {
  const nav = useNavigate();
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Create org
  const [orgName, setOrgName] = useState("");
  const [categoryChoice, setCategoryChoice] =
    useState<(typeof CATEGORY_OPTIONS)[number]>("IT");
  const [categoryCustom, setCategoryCustom] = useState("");

  const categoryFinal = useMemo(() => {
    return categoryChoice === "Custom" ? categoryCustom.trim() : categoryChoice;
  }, [categoryChoice, categoryCustom]);

  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // Join org
  const [orgId, setOrgId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [joinRole, setJoinRole] = useState<string>("ADMIN");

  // ✅ show created org id
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);

  // ✅ browse orgs (optional backend)
  const [orgs, setOrgs] = useState<OrgPublic[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [orgSearch, setOrgSearch] = useState("");

  function decodeOrgId(token: string): string | null {
    try {
      const decoded = jwtDecode<TokenPayload>(token);
      return decoded?.orgId ?? null;
    } catch {
      return null;
    }
  }

  async function onCreateOrg() {
    setLoading(true);
    setMsg(null);
    setCreatedOrgId(null);

    try {
      const res = await api.post("/auth/register/create-org", {
        orgName: orgName.trim(),
        category: categoryFinal || "General",
        name: adminName.trim(),
        email: adminEmail.trim(),
        password: adminPassword,
      });

      const token = res.data?.accessToken;
      if (!token) throw new Error("accessToken missing in response");

      saveSessionDetails({
        token,
        userName: res.data?.user?.name ?? null,
        userRole: res.data?.user?.role ?? null,
        orgName: res.data?.org?.name ?? null,
      });

      // ✅ get orgId from JWT (NO backend changes needed)
      const oid = decodeOrgId(token);
      setCreatedOrgId(oid);

      // ✅ don’t immediately navigate; show orgId to copy
      setMsg("Organization created ✅ Copy Org ID and share to allow others to join.");
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? e?.message ?? "Create org failed");
    } finally {
      setLoading(false);
    }
  }

  async function onJoinOrg() {
    setLoading(true);
    setMsg(null);

    try {
      await api.post("/auth/register/join-org", {
        orgId: orgId.trim(),
        name: name.trim(),
        email: email.trim(),
        password,
        role: joinRole,
      });

      setMsg("Join request submitted ✅ Waiting for admin approval.");
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? e?.message ?? "Join org failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadOrgs() {
    setLoadingOrgs(true);
    setMsg(null);

    try {
      // ✅ works only if you add backend route GET /orgs/public
      const res = await api.get("/orgs/public");
      setOrgs(res.data?.orgs ?? []);
    } catch (e: any) {
      setMsg(
        "Orgs list API not found. If you want this feature, add GET /orgs/public in backend."
      );
    } finally {
      setLoadingOrgs(false);
    }
  }

  async function onSearchOrgs() {
    setMsg(null);
    if (orgs.length === 0) {
      await loadOrgs();
    }
  }

  const filteredOrgs = useMemo(() => {
    const q = orgSearch.trim().toLowerCase();
    if (!q) return orgs;

    return orgs.filter((o) => {
      const name = o.name?.toLowerCase() ?? "";
      const category = o.category?.toLowerCase() ?? "";
      const id = o.id?.toLowerCase() ?? "";
      return name.includes(q) || category.includes(q) || id.includes(q);
    });
  }, [orgs, orgSearch]);

  const selectedOrgCategory = useMemo(
    () => orgs.find((o) => o.id === orgId.trim())?.category ?? null,
    [orgId, orgs]
  );

  const joinRoleOptions = useMemo(() => {
    return isEducationCategory(selectedOrgCategory)
      ? [...EDUCATION_JOIN_ROLE_OPTIONS]
      : [...ORG_JOIN_ROLE_OPTIONS];
  }, [selectedOrgCategory]);

  useEffect(() => {
    if (!joinRoleOptions.includes(joinRole as any)) {
      setJoinRole(joinRoleOptions[0]);
    }
  }, [joinRole, joinRoleOptions]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Copied ✅");
    } catch {
      setMsg("Copy failed ❌ (copy manually)");
    }
  }

  return (
    <div className="grid place-items-center px-3 py-8 sm:px-4 sm:py-12">
      <Card className="w-full max-w-xl border-white/30 bg-background/90 shadow-xl backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl tracking-tight">Organization Setup</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a new organization or join an existing one.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <Tabs defaultValue="create">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Org</TabsTrigger>
              <TabsTrigger value="join">Join Org</TabsTrigger>
            </TabsList>

            {/* CREATE */}
            <TabsContent value="create" className="space-y-4 pt-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Org Name</Label>
                  <Input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g., Supplify Team"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={categoryChoice}
                    onValueChange={(v) => setCategoryChoice(v as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {categoryChoice === "Custom" && (
                    <Input
                      className="mt-2"
                      value={categoryCustom}
                      onChange={(e) => setCategoryCustom(e.target.value)}
                      placeholder="Enter custom category"
                    />
                  )}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Admin Name</Label>
                  <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Admin Email</Label>
                  <Input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Admin Password</Label>
                <Input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Must include uppercase, lowercase, number, special character (8+ chars).
                </p>
              </div>

              <Button className="w-full" onClick={onCreateOrg} disabled={loading}>
                {loading ? "Creating..." : "Create Organization"}
              </Button>

              {/* ✅ SHOW ORG ID */}
              {createdOrgId && (
                <div className="rounded-md border p-3 space-y-2">
                  <div className="text-sm font-medium">Your Org ID</div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input readOnly value={createdOrgId} />
                    <Button variant="outline" onClick={() => copy(createdOrgId)}>
                      Copy
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Share this Org ID with teammates to join.
                  </div>

                  <Button className="w-full" onClick={() => nav("/dashboard")}>
                    Continue to Dashboard
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* JOIN */}
            <TabsContent value="join" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Organization ID</Label>
                <Input
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  placeholder="Paste orgId"
                />
              </div>

              {/* ✅ OPTIONAL: browse orgs */}
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-medium">Browse Orgs (optional)</div>
                  <Button variant="outline" onClick={loadOrgs} disabled={loadingOrgs}>
                    {loadingOrgs ? "Loading..." : "Load Orgs"}
                  </Button>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={orgSearch}
                    onChange={(e) => setOrgSearch(e.target.value)}
                    placeholder="Search by org name / category / org ID"
                  />
                  <Button variant="outline" onClick={onSearchOrgs} disabled={loadingOrgs}>
                    Search
                  </Button>
                </div>

                {filteredOrgs.length > 0 ? (
                  <div className="space-y-2">
                    {filteredOrgs.map((o) => (
                      <div
                        key={o.id}
                        className="flex flex-col gap-2 rounded-md bg-muted/30 p-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="text-sm">
                          <div className="font-medium">{o.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {o.category ?? "General"} • {o.id}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setOrgId(o.id)}
                        >
                          Use
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    {orgs.length === 0
                      ? "If you didn’t add backend route, this will show “API not found”."
                      : "No organizations found for your search."}
                  </div>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Your Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Your Role</Label>
                <Select value={joinRole} onValueChange={(v) => setJoinRole(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {joinRoleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {isEducationCategory(selectedOrgCategory)
                    ? "Education roles shown based on selected organization."
                    : "Organization roles shown based on selected organization."}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>

              <Button className="w-full" variant="outline" onClick={onJoinOrg} disabled={loading}>
                {loading ? "Submitting..." : "Submit Join Request"}
              </Button>
            </TabsContent>
          </Tabs>

          {msg && <div className="text-sm">{msg}</div>}

          <div className="text-sm text-muted-foreground">
            Already active?{" "}
            <button className="underline" onClick={() => nav("/")}>
              Go to Login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
