import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Clock,
  Users,
  Banknote,
  List,
  Map as MapIcon,
  Search,
  Filter,
} from "lucide-react";
import { RouteMap } from "@/components/RouteMap";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/routes/")({
  component: RoutesIndex,
});

type RouteRow = Tables<"routes"> & {
  profiles: { full_name: string; verified: boolean } | null;
};

function RoutesIndex() {
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const { data, error } = await supabase
          .from("routes")
          .select("*, profiles:driver_id(full_name, verified)")
          .eq("is_active", true)
          .neq("driver_id", (await supabase.auth.getUser()).data.user?.id || "")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setRoutes((data as unknown as RouteRow[]) ?? []);
      } catch (err: any) {
        console.error("Failed to fetch routes:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRoutes();
  }, []);

  const filtered = routes.filter((r) => {
    const s = q.toLowerCase();
    return (
      !s ||
      r.start_location.toLowerCase().includes(s) ||
      r.end_location.toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">
              Find your route
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Browse active routes from verified drivers in your community.
            </p>
          </div>

          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as "list" | "map")}
            className="w-full md:w-auto"
          >
            <TabsList className="grid w-full grid-cols-2 h-11 p-1">
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" /> List
              </TabsTrigger>
              <TabsTrigger value="map" className="gap-2">
                <MapIcon className="h-4 w-4" /> Map
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="mb-8 flex flex-col gap-4 md:flex-row">
          <Card className="flex-1 overflow-hidden border-none shadow-lg">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by start or destination (e.g. Tema, Madina, Legon)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-12 border-none pl-12 text-lg focus-visible:ring-0"
              />
            </div>
          </Card>
          <Button
            variant="outline"
            className="h-12 gap-2 border-none shadow-lg bg-background"
          >
            <Filter className="h-5 w-5" /> Filters
          </Button>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-16 text-center border-none shadow-xl">
            <div className="mb-4 rounded-full bg-muted p-6">
              <Search className="h-12 w-12 text-muted-foreground opacity-20" />
            </div>
            <h3 className="text-xl font-bold">No routes found</h3>
            <p className="mt-2 max-w-sm text-muted-foreground">
              We couldn't find any routes matching your search. Try a different
              location or offer your own ride.
            </p>
            <Button asChild className="mt-8 h-12 px-8 text-lg font-semibold">
              <Link to="/routes/new">Offer a Ride instead</Link>
            </Button>
          </Card>
        ) : (
          <>
            {viewMode === "list" ? (
              <div className="grid gap-6 md:grid-cols-2">
                {filtered.map((r) => (
                  <Card
                    key={r.id}
                    className="group relative overflow-hidden border-none p-6 shadow-xl transition-all hover:scale-[1.01] hover:shadow-2xl"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            <div className="h-4 w-0.5 bg-muted-foreground/20" />
                            <div className="h-2 w-2 rounded-full border-2 border-primary bg-background" />
                          </div>
                          <div className="flex flex-col text-sm font-bold">
                            <span>{r.start_location}</span>
                            <span className="text-muted-foreground">
                              {r.end_location}
                            </span>
                          </div>
                        </div>
                      </div>
                      {r.profiles?.verified && (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary border-none"
                        >
                          Verified Driver
                        </Badge>
                      )}
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-4 border-y border-muted/50 py-4">
                      <div className="flex flex-col items-center gap-1">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-sm font-bold">
                          {r.departure_time.slice(0, 5)}
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="text-sm font-bold">
                          {r.available_seats} seats
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <Banknote className="h-4 w-4 text-primary" />
                        <span className="text-sm font-bold text-primary">
                          GHS {Number(r.price_per_seat).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold uppercase">
                          {r.profiles?.full_name?.charAt(0) ?? "D"}
                        </div>
                        <div className="text-sm font-medium">
                          {r.profiles?.full_name ?? "Driver"}
                        </div>
                      </div>
                      <Button asChild className="font-bold shadow-lg">
                        <Link to="/routes/$routeId" params={{ routeId: r.id }}>
                          View & Request
                        </Link>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <RouteMap routes={filtered} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
