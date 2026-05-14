import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  MapPin,
  Clock,
  Users,
  Banknote,
  Car as CarIcon,
  ArrowRight,
  Check,
  MousePointer2,
} from "lucide-react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Tables } from "@/integrations/supabase/types";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const routeSchema = z.object({
  startLocation: z.string().min(2, "Start location is required"),
  endLocation: z.string().min(2, "End location is required"),
  description: z.string().optional(),
  departureTime: z.string(),
  availableSeats: z.number().min(1).max(8),
  pricePerSeat: z.number().min(0),
  daysOfWeek: z.array(z.string()).min(1, "Select at least one day"),
  startLat: z.number().optional(),
  startLng: z.number().optional(),
  endLat: z.number().optional(),
  endLng: z.number().optional(),
});

type RouteValues = z.infer<typeof routeSchema>;

export const Route = createFileRoute("/routes/new")({
  component: NewRoute,
});

function NewRoute() {
  const { user, isDriver, refreshRoles, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [car, setCar] = useState<Tables<"cars"> | null>(null);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [picking, setPicking] = useState<"start" | "end" | null>(null);
  const startMarker = useRef<mapboxgl.Marker | null>(null);
  const endMarker = useRef<mapboxgl.Marker | null>(null);
  const [routeDistance, setRouteDistance] = useState(0);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RouteValues>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      startLocation: "",
      endLocation: "",
      description: "",
      departureTime: "07:00",
      availableSeats: 3,
      pricePerSeat: 15,
      daysOfWeek: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    },
  });

  const startCoords = watch(["startLat", "startLng"]);
  const endCoords = watch(["endLat", "endLng"]);

  useEffect(() => {
    if (!authLoading && !user) nav({ to: "/auth" });
  }, [user, authLoading, nav]);

  useEffect(() => {
    if (user && isDriver) {
      fetchCar();
    }
  }, [user, isDriver]);

  useEffect(() => {
    if (!isDriver || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-0.187, 5.603],
      zoom: 12,
    });

    map.current.on("click", async (e) => {
      if (!picking) return;
      const { lng, lat } = e.lngLat;

      if (picking === "start") {
        setValue("startLat", lat);
        setValue("startLng", lng);
        if (!startMarker.current) {
          startMarker.current = new mapboxgl.Marker({ color: "#10b981" })
            .setLngLat([lng, lat])
            .addTo(map.current!);
        } else {
          startMarker.current.setLngLat([lng, lat]);
        }
        setPicking(null);
        toast.success("Start location pinned!");
      } else {
        setValue("endLat", lat);
        setValue("endLng", lng);
        if (!endMarker.current) {
          endMarker.current = new mapboxgl.Marker({ color: "#ef4444" })
            .setLngLat([lng, lat])
            .addTo(map.current!);
        } else {
          endMarker.current.setLngLat([lng, lat]);
        }
        setPicking(null);
        toast.success("End location pinned!");
      }

      // Automatically fetch and show route if both points exist
      const sLat = watch("startLat");
      const sLng = watch("startLng");
      const eLat = watch("endLat");
      const eLng = watch("endLng");

      if (sLat && sLng && eLat && eLng) {
        fetchRoute(sLng, sLat, eLng, eLat);
      }
    });

    const fetchRoute = async (
      sLng: number,
      sLat: number,
      eLng: number,
      eLat: number,
    ) => {
      try {
        const query = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${sLng},${sLat};${eLng},${eLat}?geometries=geojson&access_token=${mapboxgl.accessToken}`,
        );
        const json = await query.json();
        const data = json.routes[0];

        // Save to state/hidden fields if needed, but we'll use them on submit
        if (map.current?.getSource("route")) {
          (map.current.getSource("route") as mapboxgl.GeoJSONSource).setData(
            data.geometry,
          );
        } else {
          map.current?.addSource("route", {
            type: "geojson",
            data: data.geometry,
          });
          map.current?.addLayer({
            id: "route",
            type: "line",
            source: "route",
            paint: { "line-color": "#3b82f6", "line-width": 4 },
          });
        }

        const bounds = new mapboxgl.LngLatBounds();
        data.geometry.coordinates.forEach((c: any) => bounds.extend(c));
        map.current?.fitBounds(bounds, { padding: 50 });

        setRouteDistance(data.distance); // Store distance in meters
      } catch (err) {
        console.error("Route fetch error:", err);
      }
    };

    return () => map.current?.remove();
  }, [isDriver]);

  const fetchCar = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("cars")
      .select("*")
      .eq("owner_id", user.id)
      .single();
    if (data) setCar(data);
  };

  const becomeDriver = async () => {
    if (!user) return;
    const { error } = await supabase.functions.invoke("send-otp", {
      body: { action: "become-driver", userId: user.id },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshRoles();
    toast.success("You're now a driver!");
  };

  const onSubmit = async (values: RouteValues) => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("routes")
        .insert({
          driver_id: user.id,
          start_location: values.startLocation,
          end_location: values.endLocation,
          description: values.description || null,
          days_of_week: values.daysOfWeek,
          departure_time: values.departureTime,
          available_seats: values.availableSeats,
          price_per_seat: values.pricePerSeat,
          // @ts-expect-error
          start_lat: values.startLat,
          // @ts-expect-error
          start_lng: values.startLng,
          // @ts-expect-error
          end_lat: values.endLat,
          // @ts-expect-error
          end_lng: values.endLng,
          // @ts-expect-error
          polyline: JSON.stringify(
            (map.current?.getSource("route") as any)?._data?.geometry
              ?.coordinates,
          ),
          // @ts-expect-error
          total_distance: routeDistance,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Route published successfully!");
      nav({ to: "/routes/$routeId", params: { routeId: data.id } });
    } catch (err: any) {
      toast.error(err.message || "Failed to publish route");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-lg font-medium">Loading...</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">
            Offer a ride
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Share your commute and save costs with others.
          </p>
        </div>

        {!isDriver && (
          <Card className="overflow-hidden border-none bg-gradient-to-br from-primary/10 to-transparent p-8 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
                <CarIcon className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold">Become a Driver</h2>
              <p className="mt-2 max-w-sm text-muted-foreground">
                Drivers can publish routes, set their own prices, and help
                reduce traffic in the city.
              </p>
              <Button
                className="mt-6 h-12 px-8 text-lg font-semibold shadow-md transition-all hover:scale-105"
                onClick={becomeDriver}
              >
                Activate Driver Mode
              </Button>
            </div>
          </Card>
        )}

        {isDriver && (
          <div className="grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Map Section */}
                <Card className="overflow-hidden border-none shadow-xl relative">
                  <div className="p-6 bg-background border-b flex items-center justify-between">
                    <h2 className="font-bold flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-primary" />
                      Select Route on Map
                    </h2>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={picking === "start" ? "default" : "outline"}
                        onClick={() => setPicking("start")}
                        className="h-8"
                      >
                        {startCoords[0] ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : (
                          <MousePointer2 className="h-3 w-3 mr-1" />
                        )}
                        Set Start
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={picking === "end" ? "default" : "outline"}
                        onClick={() => setPicking("end")}
                        className="h-8"
                      >
                        {endCoords[0] ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : (
                          <MousePointer2 className="h-3 w-3 mr-1" />
                        )}
                        Set End
                      </Button>
                    </div>
                  </div>
                  <div className="relative">
                    <div ref={mapContainer} className="h-80 w-full" />
                    {picking && (
                      <div className="absolute inset-0 bg-primary/10 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                        <div className="bg-background/90 px-4 py-2 rounded-full shadow-lg border border-primary/20 text-xs font-bold animate-bounce">
                          Click on the map to set {picking} location
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Route Section */}
                <Card className="overflow-hidden border-none p-8 shadow-xl">
                  <div className="mb-8 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <h2 className="text-2xl font-bold">Route Details</h2>
                  </div>

                  <div className="grid gap-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label
                          htmlFor="startLocation"
                          className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          Start Location (Text)
                        </Label>
                        <Input
                          id="startLocation"
                          className={`h-12 ${errors.startLocation ? "border-destructive" : ""}`}
                          placeholder="e.g., Tema Comm. 1"
                          {...register("startLocation")}
                        />
                        {errors.startLocation && (
                          <p className="text-xs text-destructive">
                            {errors.startLocation.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="endLocation"
                          className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          End Location (Text)
                        </Label>
                        <Input
                          id="endLocation"
                          className={`h-12 ${errors.endLocation ? "border-destructive" : ""}`}
                          placeholder="e.g., Accra CBD"
                          {...register("endLocation")}
                        />
                        {errors.endLocation && (
                          <p className="text-xs text-destructive">
                            {errors.endLocation.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Schedule (Days)
                      </Label>
                      <Controller
                        name="daysOfWeek"
                        control={control}
                        render={({ field }) => (
                          <div className="flex flex-wrap gap-2">
                            {DAYS.map((d) => {
                              const on = field.value.includes(d);
                              return (
                                <button
                                  type="button"
                                  key={d}
                                  onClick={() => {
                                    const newVal = on
                                      ? field.value.filter((x) => x !== d)
                                      : [...field.value, d];
                                    field.onChange(newVal);
                                  }}
                                  className={`flex h-10 min-w-[2.8rem] items-center justify-center rounded-lg border-2 font-bold transition-all ${on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/10 bg-background text-muted-foreground"}`}
                                >
                                  {d[0]}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      />
                    </div>
                  </div>
                </Card>

                <Card className="overflow-hidden border-none p-8 shadow-xl">
                  <div className="grid gap-6 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label
                        htmlFor="departureTime"
                        className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        Departure
                      </Label>
                      <Input
                        id="departureTime"
                        type="time"
                        className="h-12"
                        {...register("departureTime")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="availableSeats"
                        className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        Seats
                      </Label>
                      <Input
                        id="availableSeats"
                        type="number"
                        min={1}
                        max={8}
                        className="h-12"
                        {...register("availableSeats", { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="pricePerSeat"
                        className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        GHS / Seat
                      </Label>
                      <Input
                        id="pricePerSeat"
                        type="number"
                        min={0}
                        className="h-12 font-bold text-primary"
                        {...register("pricePerSeat", { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                </Card>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-16 w-full text-xl font-bold shadow-xl transition-all hover:scale-[1.01]"
                >
                  {submitting ? "Publishing..." : "Publish Route"}
                </Button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6 shadow-xl border-none">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <CarIcon className="h-5 w-5 text-primary" />
                  Your Vehicle
                </h3>
                {car ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Vehicle:</span>
                      <span className="font-bold">
                        {car.make} {car.model}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Plate:</span>
                      <span className="font-bold">{car.plate_number}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      No vehicle details found.
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/onboarding">Setup Vehicle</Link>
                    </Button>
                  </div>
                )}
              </Card>

              <Card className="p-6 shadow-xl border-none">
                <Label htmlFor="description" className="font-bold block mb-2">
                  Additional Notes
                </Label>
                <Textarea
                  id="description"
                  className="min-h-[150px]"
                  placeholder="Tell passengers about your route, preferences, or pickup points..."
                  {...register("description")}
                />
              </Card>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            to="/dashboard"
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1"
          >
            <ArrowRight className="h-4 w-4 rotate-180" /> Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function Navigation(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  );
}
