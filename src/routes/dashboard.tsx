import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  MapPin,
  ArrowRight,
  MessageCircle,
  Plus,
  Users,
  Clock,
  Play,
  CheckCircle2,
  Navigation,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Route = Tables<"routes">;

type MyRequest = Tables<"ride_requests"> & {
  routes: {
    start_location: string;
    end_location: string;
    departure_time: string;
  } | null;
};

type IncomingRequest = Tables<"ride_requests"> & {
  routes: {
    start_location: string;
    end_location: string;
  } | null;
  profiles: {
    full_name: string;
  } | null;
};

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user, loading, isDriver } = useAuth();
  const nav = useNavigate();
  const [myRoutes, setMyRoutes] = useState<Route[]>([]);
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setFetching(true);
      try {
        const [routesRes, requestsRes, incomingRes] = await Promise.all([
          supabase
            .from("routes")
            .select("*")
            .eq("driver_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("ride_requests")
            .select("*, routes(start_location, end_location, departure_time)")
            .eq("passenger_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("ride_requests")
            .select(
              "*, routes(start_location, end_location), profiles:passenger_id(full_name)",
            )
            .eq("driver_id", user.id)
            .order("created_at", { ascending: false }),
        ]);

        if (routesRes.error) throw routesRes.error;
        if (requestsRes.error) throw requestsRes.error;
        if (incomingRes.error) throw incomingRes.error;

        setMyRoutes((routesRes.data as Route[]) || []);
        setMyRequests((requestsRes.data as MyRequest[]) || []);
        setIncoming((incomingRes.data as any) || []);
      } catch (err: any) {
        toast.error(err.message || "Failed to load dashboard data");
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [user]);

  const updateRequest = async (id: string, status: any) => {
    const { error } = await supabase
      .from("ride_requests")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Ride status: ${status}`);
    setIncoming((p) => p.map((r) => (r.id === id ? { ...r, status } : r)));

    // Start tracking if en_route
    if (status === "en_route") {
      startTracking(id);
    }
  };

  const startTracking = (requestId: string) => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        await supabase
          .from("ride_requests")
          .update({
            // @ts-expect-error - these columns added via SQL
            driver_lat: lat,
            driver_lng: lng,
          })
          .eq("id", requestId);
      },
      (err) => console.error("Tracking error:", err),
      { enableHighAccuracy: true },
    );

    // Stop tracking after 1 hour or when completed (simple implementation)
    setTimeout(() => navigator.geolocation.clearWatch(watchId), 3600000);
  };

  const toggleRoute = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from("routes")
      .update({ is_active: !active })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMyRoutes((p) =>
      p.map((r) => (r.id === id ? { ...r, is_active: !active } : r)),
    );
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your routes and requests.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={async () => {
                const toastId = toast.loading("Seeding routes...");

                await supabase.from("profiles").upsert({
                  id: user.id,
                  full_name: "Demo Driver",
                  verified: true,
                });

                await supabase.from("user_roles").upsert({
                  user_id: user.id,
                  role: "driver",
                });

                await supabase.from("cars").upsert({
                  owner_id: user.id,
                  make: "Toyota",
                  model: "Corolla",
                  plate_number: "GW-123-24",
                });

                const demoRoutes = [
                  {
                    driver_id: user.id,
                    start_location: "Tema Community 25",
                    end_location: "Accra Mall",
                    days_of_week: ["Mon", "Tue", "Wed", "Thu", "Fri"],
                    departure_time: "06:30",
                    available_seats: 3,
                    price_per_seat: 20,
                    description:
                      "Leaving early to beat traffic. Air-conditioned ride.",
                    is_active: true,
                  },
                  {
                    driver_id: user.id,
                    start_location: "Madina Zongo Junction",
                    end_location: "Osu Oxford Street",
                    days_of_week: ["Mon", "Wed", "Fri"],
                    departure_time: "07:00",
                    available_seats: 2,
                    price_per_seat: 15,
                    description: "Direct route through Independence Ave.",
                    is_active: true,
                  },
                ];
                const { error } = await supabase
                  .from("routes")
                  .insert(demoRoutes);
                if (error) {
                  toast.error("Failed to insert routes: " + error.message, {
                    id: toastId,
                  });
                } else {
                  toast.success("Demo routes added! Please refresh.", {
                    id: toastId,
                  });
                  window.location.reload();
                }
              }}
            >
              Seed Demo Routes
            </Button>
            <Button asChild>
              <Link to="/routes/new">
                <Plus className="h-4 w-4" /> New route
              </Link>
            </Button>
          </div>
        </div>

        {fetching && (
          <div className="mt-8 flex justify-center">
            <div className="animate-pulse text-primary">Loading data...</div>
          </div>
        )}

        {!fetching && (
          <>
            {isDriver && incoming.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-3 text-xl font-semibold">
                  Incoming requests
                </h2>
                <div className="grid gap-3">
                  {incoming.map((r) => (
                    <Card
                      key={r.id}
                      className="p-4 shadow-sm border-none bg-muted/20 overflow-hidden relative"
                    >
                      {/* Status indicator line */}
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1 ${
                          (r.status as string) === "en_route"
                            ? "bg-blue-500 animate-pulse"
                            : r.status === "accepted"
                              ? "bg-success"
                              : r.status === "pending"
                                ? "bg-accent"
                                : "bg-muted"
                        }`}
                      />

                      <div className="flex flex-wrap items-center justify-between gap-3 ml-2">
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <MapPin className="h-4 w-4 text-primary" />{" "}
                            {r.routes?.start_location}{" "}
                            <ArrowRight className="h-3 w-3" />{" "}
                            {r.routes?.end_location}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
                            <span>
                              From{" "}
                              <span className="font-semibold text-foreground">
                                {r.profiles?.full_name}
                              </span>
                            </span>
                            <span>·</span>
                            <span>{r.seats_requested} seat(s)</span>
                            {/* @ts-expect-error - added via SQL */}
                            {r.payment_status === "paid" && (
                              <Badge
                                variant="outline"
                                className="bg-success/10 text-success border-success/20 text-[10px] h-5"
                              >
                                Paid
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <StatusBadge status={r.status} />
                          <div className="flex gap-1.5">
                            {r.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    updateRequest(r.id, "accepted")
                                  }
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    updateRequest(r.id, "declined")
                                  }
                                >
                                  Decline
                                </Button>
                              </>
                            )}
                            {(r.status as string) === "accepted" && (
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => updateRequest(r.id, "en_route")}
                              >
                                <Play className="h-3.5 w-3.5 mr-1" /> Start Ride
                              </Button>
                            )}
                            {(r.status as string) === "en_route" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-success border-success hover:bg-success/10"
                                onClick={() => updateRequest(r.id, "completed")}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />{" "}
                                Complete
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              asChild
                              className="rounded-full"
                            >
                              <Link
                                to="/chat/$requestId"
                                params={{ requestId: r.id }}
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-8">
              <h2 className="mb-3 text-xl font-semibold">
                My routes ({myRoutes.length})
              </h2>
              {myRoutes.length === 0 ? (
                <Card className="p-12 text-center text-muted-foreground bg-muted/10 border-dashed border-2">
                  No routes yet.{" "}
                  <Link
                    to="/routes/new"
                    className="text-primary font-bold hover:underline"
                  >
                    Publish your first route
                  </Link>
                  .
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {myRoutes.map((r) => (
                    <Card
                      key={r.id}
                      className="p-5 shadow-sm border-none bg-card"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-bold">
                          <MapPin className="h-4 w-4 text-primary" />
                          {
                            r.start_location
                          } <ArrowRight className="h-3 w-3" /> {r.end_location}
                        </div>
                        <Badge variant={r.is_active ? "default" : "secondary"}>
                          {r.is_active ? "Active" : "Paused"}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />{" "}
                          {r.departure_time.slice(0, 5)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> {r.available_seats}
                        </span>
                        <span className="font-semibold text-primary">
                          GHS {Number(r.price_per_seat).toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleRoute(r.id, r.is_active)}
                        >
                          {r.is_active ? "Pause" : "Resume"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-primary hover:text-primary hover:bg-primary/5"
                          asChild
                        >
                          <Link
                            to="/routes/$routeId"
                            params={{ routeId: r.id }}
                          >
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-8 pb-10">
              <h2 className="mb-3 text-xl font-semibold">My ride requests</h2>
              {myRequests.length === 0 ? (
                <Card className="p-12 text-center text-muted-foreground bg-muted/10 border-dashed border-2">
                  No requests yet.{" "}
                  <Link
                    to="/routes"
                    className="text-primary font-bold hover:underline"
                  >
                    Browse routes
                  </Link>
                  .
                </Card>
              ) : (
                <div className="grid gap-3">
                  {myRequests.map((r) => (
                    <Card
                      key={r.id}
                      className="p-4 shadow-sm border-none overflow-hidden relative"
                    >
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1 ${
                          (r.status as string) === "en_route"
                            ? "bg-blue-500 animate-pulse"
                            : r.status === "accepted"
                              ? "bg-success"
                              : r.status === "pending"
                                ? "bg-accent"
                                : "bg-muted"
                        }`}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2 ml-2">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <MapPin className="h-4 w-4 text-primary" />{" "}
                            {r.routes?.start_location}{" "}
                            <ArrowRight className="h-3 w-3" />{" "}
                            {r.routes?.end_location}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                            <span>{r.routes?.departure_time?.slice(0, 5)}</span>
                            <span>·</span>
                            <span>{r.seats_requested} seat(s)</span>
                            {/* @ts-expect-error */}
                            {r.payment_status === "paid" && (
                              <Badge
                                variant="outline"
                                className="bg-success/10 text-success border-success/20 text-[10px] h-5"
                              >
                                Paid
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={r.status} />
                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                            className="rounded-full"
                          >
                            <Link
                              to="/chat/$requestId"
                              params={{ requestId: r.id }}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { className: string; icon: any }> = {
    pending: { className: "bg-accent/20 text-accent-foreground", icon: Clock },
    accepted: { className: "bg-success/20 text-success", icon: CheckCircle2 },
    en_route: {
      className: "bg-blue-500/20 text-blue-600 animate-pulse",
      icon: Navigation,
    },
    declined: { className: "bg-destructive/15 text-destructive", icon: Clock },
    cancelled: { className: "bg-muted text-muted-foreground", icon: Clock },
    completed: { className: "bg-primary/15 text-primary", icon: CheckCircle2 },
  };

  const config = map[status] || map.pending;
  const Icon = config.icon;

  return (
    <span
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] uppercase tracking-wider font-bold ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      {status.replace("_", " ")}
    </span>
  );
}
