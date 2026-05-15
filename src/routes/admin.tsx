import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Users,
  Car,
  MessageSquare,
  Flag,
  Trash2,
  ShieldCheck,
  ShieldX,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<"users" | "routes" | "requests" | "reports">(
    "users",
  );
  const [users, setUsers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [stats, setStats] = useState({
    users: 0,
    routes: 0,
    requests: 0,
    reports: 0,
  });
  const [q, setQ] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav({ to: "/auth" });
      return;
    }
    if (!isAdmin) {
      /* still load page so user sees notice */
    }
  }, [user, isAdmin, loading, nav]);

  const load = async () => {
    const [u, r, rq, rp] = await Promise.all([
      supabase
        .from("profiles")
        .select("*, user_roles(role)")
        .order("created_at", { ascending: false }),
      supabase
        .from("routes")
        .select("*, profiles:driver_id(full_name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("ride_requests")
        .select(
          "*, routes(start_location, end_location), passenger:passenger_id(full_name), driver:driver_id(full_name)",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("reports")
        .select(
          "*, reporter:reporter_id(full_name), reported:reported_user_id(full_name)",
        )
        .order("created_at", { ascending: false }),
    ]);
    setUsers(u.data ?? []);
    setRoutes(r.data ?? []);
    setRequests(rq.data ?? []);
    setReports(rp.data ?? []);
    setStats({
      users: u.data?.length ?? 0,
      routes: r.data?.length ?? 0,
      requests: rq.data?.length ?? 0,
      reports: rp.data?.length ?? 0,
    });
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const toggleVerified = async (id: string, v: boolean) => {
    await supabase.from("profiles").update({ verified: !v }).eq("id", id);
    setUsers((p) => p.map((x) => (x.id === id ? { ...x, verified: !v } : x)));
  };

  const toggleAdmin = async (uid: string, hasRole: boolean) => {
    if (hasRole) {
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", uid)
        .eq("role", "admin");
      toast.success("Admin removed");
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: uid, role: "admin" });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Made admin");
    }
    load();
  };

  const deleteRoute = async (id: string) => {
    if (!confirm("Delete this route?")) return;
    await supabase.from("routes").delete().eq("id", id);
    setRoutes((p) => p.filter((x) => x.id !== id));
  };

  const resolveReport = async (id: string) => {
    await supabase.from("reports").update({ resolved: true }).eq("id", id);
    setReports((p) =>
      p.map((x) => (x.id === id ? { ...x, resolved: true } : x)),
    );
  };

  if (loading)
    return (
      <div className="min-h-screen">
        <Navbar />
        <p className="p-8">Loading...</p>
      </div>
    );
  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="mx-auto max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold">Admin only</h1>
          <p className="mt-2 text-muted-foreground">
            You don't have admin access. Ask an admin to grant you the role, or
            use the SQL console to give yourself the admin role for your user.
          </p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(
    (u) => !q || u.full_name?.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin dashboard</h1>
            <p className="text-muted-foreground">
              Manage everything across RideShare GH.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard icon={Users} label="Users" value={stats.users} />
          <StatCard icon={Car} label="Routes" value={stats.routes} />
          <StatCard
            icon={MessageSquare}
            label="Requests"
            value={stats.requests}
          />
          <StatCard icon={Flag} label="Reports" value={stats.reports} />
        </div>

        <div className="mt-8 flex flex-wrap gap-1 border-b">
          {(["users", "routes", "requests", "reports"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition ${tab === t ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "users" && (
            <div className="space-y-6">
              <Card className="p-6 border-primary/20 bg-primary/5">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Grant Admin Access
                </h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const target = e.currentTarget as HTMLFormElement;
                    const identifier = (
                      target.elements.namedItem(
                        "identifier",
                      ) as HTMLInputElement
                    ).value;
                    if (!identifier) return;

                    const { data: profile, error: findError } = await supabase
                      .from("profiles")
                      .select("id")
                      .or(`phone.eq.${identifier},work_email.eq.${identifier}`)
                      .maybeSingle();

                    if (findError || !profile) {
                      toast.error("User not found with that phone or email");
                      return;
                    }

                    await toggleAdmin(profile.id, false);
                    target.reset();
                  }}
                  className="flex gap-3"
                >
                  <Input
                    name="identifier"
                    placeholder="Enter user phone or email..."
                    className="max-w-md bg-background"
                  />
                  <Button type="submit">Grant Admin</Button>
                </form>
                <p className="mt-2 text-xs text-muted-foreground italic">
                  Note: The user must have a profile (signed in at least once).
                </p>
              </Card>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-bold">User Directory</h3>
                  <Input
                    placeholder="Search by name, phone or email..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                {filteredUsers.length === 0 && (
                  <p className="text-center py-10 text-muted-foreground">
                    No users found.
                  </p>
                )}
                {filteredUsers.map((u) => {
                  const isAdminUser = u.user_roles?.some(
                    (r: any) => r.role === "admin",
                  );
                  return (
                    <Card
                      key={u.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-4"
                    >
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {u.full_name || "(no name)"}
                          {isAdminUser && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 h-5 px-1.5 text-[9px]">
                              ADMIN
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground space-x-2">
                          <span>{u.phone ?? "No phone"}</span>
                          <span>·</span>
                          <span>{u.work_email ?? "No email"}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {u.verified ? (
                          <Badge className="bg-success/10 text-success border-success/20">
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline">Unverified</Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleVerified(u.id, u.verified)}
                        >
                          {u.verified ? (
                            <>
                              <ShieldX className="h-4 w-4" /> Unverify
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="h-4 w-4" /> Verify
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant={isAdminUser ? "destructive" : "default"}
                          onClick={() => toggleAdmin(u.id, isAdminUser)}
                        >
                          {isAdminUser ? "Remove Admin" : "Make Admin"}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "routes" && (
            <div className="space-y-3">
              {routes.map((r) => (
                <Card
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div>
                    <div className="font-semibold">
                      {r.start_location} → {r.end_location}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      By {r.profiles?.full_name} ·{" "}
                      {r.departure_time?.slice(0, 5)} · GHS {r.price_per_seat} ·{" "}
                      {r.available_seats} seats
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={r.is_active ? "default" : "secondary"}>
                      {r.is_active ? "Active" : "Paused"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteRoute(r.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {tab === "requests" && (
            <div className="space-y-3">
              {requests.map((r) => (
                <Card
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div>
                    <div className="font-semibold">
                      {r.routes?.start_location} → {r.routes?.end_location}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.passenger?.full_name} → {r.driver?.full_name}
                    </div>
                  </div>
                  <Badge>{r.status}</Badge>
                </Card>
              ))}
            </div>
          )}

          {tab === "reports" && (
            <div className="space-y-3">
              {reports.length === 0 && (
                <p className="text-muted-foreground">No reports.</p>
              )}
              {reports.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">
                        {r.reporter?.full_name} reported {r.reported?.full_name}
                      </div>
                      <div className="mt-1 text-sm">{r.reason}</div>
                      {r.details && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {r.details}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {r.resolved ? (
                        <Badge variant="secondary">Resolved</Badge>
                      ) : (
                        <Button size="sm" onClick={() => resolveReport(r.id)}>
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: any) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-bold">{value}</div>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  );
}
