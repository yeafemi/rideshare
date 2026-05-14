import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  MapPin,
  Clock,
  Users,
  Banknote,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Info,
  Navigation,
} from "lucide-react";
import PaystackPop from "@paystack/inline-js";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export const Route = createFileRoute("/routes/$routeId")({
  component: RouteDetail,
});

const FALLBACK_COORDS: Record<string, [number, number]> = {
  Accra: [-0.187, 5.6037],
  Tema: [-0.0164, 5.6685],
  Madina: [-0.1652, 5.6682],
  Legon: [-0.1869, 5.6508],
};

function RouteDetail() {
  const { routeId } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [seats, setSeats] = useState(1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pickup, setPickup] = useState<[number, number] | null>(null);
  const [dropoff, setDropoff] = useState<[number, number] | null>(null);
  const [userDistance, setUserDistance] = useState(0);
  const [activeStep, setActiveStep] = useState<"pickup" | "dropoff" | null>(
    null,
  );
  const [confirmed, setConfirmed] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const [fullRouteDistance, setFullRouteDistance] = useState(0);
  const [landmarks, setLandmarks] = useState<
    { name: string; coords: [number, number] }[]
  >([]);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const pMarker = useRef<mapboxgl.Marker | null>(null);
  const dMarker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("routes")
        .select(
          "*, profiles:driver_id(full_name, phone, verified, photo_url, work_email)",
        )
        .eq("id", routeId)
        .maybeSingle();
      setRoute(data);
      setLoading(false);
    })();
  }, [routeId]);

  useEffect(() => {
    if (loading || !route || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/navigation-night-v1",
      center: [-0.187, 5.603],
      zoom: 12,
    });

    const startLng =
      route.start_lng ||
      FALLBACK_COORDS[
        Object.keys(FALLBACK_COORDS).find((k) =>
          route.start_location.includes(k),
        ) || "Accra"
      ][0];
    const startLat =
      route.start_lat ||
      FALLBACK_COORDS[
        Object.keys(FALLBACK_COORDS).find((k) =>
          route.start_location.includes(k),
        ) || "Accra"
      ][1];
    const endLng =
      route.end_lng ||
      FALLBACK_COORDS[
        Object.keys(FALLBACK_COORDS).find((k) =>
          route.end_location.includes(k),
        ) || "Accra"
      ][0];
    const endLat =
      route.end_lat ||
      FALLBACK_COORDS[
        Object.keys(FALLBACK_COORDS).find((k) =>
          route.end_location.includes(k),
        ) || "Accra"
      ][1];

    new mapboxgl.Marker({ color: "#10b981" })
      .setLngLat([startLng, startLat])
      .addTo(map.current);
    new mapboxgl.Marker({ color: "#ef4444" })
      .setLngLat([endLng, endLat])
      .addTo(map.current);

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([startLng, startLat]);
    bounds.extend([endLng, endLat]);
    map.current.fitBounds(bounds, { padding: 50 });

    map.current.fitBounds(bounds, { padding: 50 });

    pMarker.current = new mapboxgl.Marker({ color: "#10b981", scale: 0.8 });
    dMarker.current = new mapboxgl.Marker({ color: "#ef4444", scale: 0.8 });

    map.current.on("load", () => {
      if (route) drawFullRoute();
    });

    map.current.on("click", (e) => {
      // Use a hidden ref or element property to handle this because state is stale in the listener
      const currentStep = mapContainer.current?.getAttribute("data-step");
      const { lng, lat } = e.lngLat;

      if (currentStep === "pickup") {
        pMarker.current?.setLngLat([lng, lat]).addTo(map.current!);
        setPickup([lng, lat]);
        mapContainer.current?.setAttribute("data-step", "");
      } else if (currentStep === "dropoff") {
        dMarker.current?.setLngLat([lng, lat]).addTo(map.current!);
        setDropoff([lng, lat]);
        mapContainer.current?.setAttribute("data-step", "");
      }
    });

    return () => map.current?.remove();
  }, [loading, route]);

  const baseRoutePrice = route ? Number(route.price_per_seat) : 0;
  const finalFullDist = route?.total_distance || fullRouteDistance;
  const proportionalPrice =
    userDistance > 0 && finalFullDist > 0
      ? userDistance <= finalFullDist / 2
        ? (baseRoutePrice / 2) * seats
        : baseRoutePrice * seats
      : baseRoutePrice * seats;

  const totalPrice = Math.max(proportionalPrice, 3); // Minimum fare of 3 GHS
  const commission = totalPrice * 0.1;

  useEffect(() => {
    if (route && map.current) {
      drawFullRoute();
    }
  }, [route, map.current]);

  const drawFullRoute = async () => {
    if (!route || !map.current || !map.current.isStyleLoaded()) return;

    // Use fallback coordinates if direct GPS is missing (for older routes)
    const sLng =
      route.start_lng ||
      FALLBACK_COORDS[
        Object.keys(FALLBACK_COORDS).find((k) =>
          route.start_location.includes(k),
        ) || "Accra"
      ][0];
    const sLat =
      route.start_lat ||
      FALLBACK_COORDS[
        Object.keys(FALLBACK_COORDS).find((k) =>
          route.start_location.includes(k),
        ) || "Accra"
      ][1];
    const eLng =
      route.end_lng ||
      FALLBACK_COORDS[
        Object.keys(FALLBACK_COORDS).find((k) =>
          route.end_location.includes(k),
        ) || "Accra"
      ][0];
    const eLat =
      route.end_lat ||
      FALLBACK_COORDS[
        Object.keys(FALLBACK_COORDS).find((k) =>
          route.end_location.includes(k),
        ) || "Accra"
      ][1];

    try {
      const query = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${sLng},${sLat};${eLng},${eLat}?geometries=geojson&steps=true&access_token=${mapboxgl.accessToken}`,
      );
      const json = await query.json();
      const data = json.routes[0];

      setFullRouteDistance(data.distance);

      // Extract landmarks from route steps (Intersections/Streets)
      const stops: { name: string; coords: [number, number] }[] = [];
      data.legs[0].steps.forEach((step: any) => {
        if (
          step.name &&
          step.name !== "" &&
          !stops.find((s) => s.name === step.name)
        ) {
          stops.push({
            name: `Street: ${step.name}`,
            coords: step.maneuver.location,
          });
        }
      });

      // Fetch additional POIs (Bus stops, Companies, Landmarks) along the route
      // We sample the start, mid, and end points for efficiency
      const samplePoints = [
        data.geometry.coordinates[0],
        data.geometry.coordinates[
          Math.floor(data.geometry.coordinates.length / 2)
        ],
        data.geometry.coordinates[data.geometry.coordinates.length - 1],
      ];

      for (const [lng, lat] of samplePoints) {
        try {
          const poiQuery = await fetch(
            `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lng},${lat}.json?radius=500&layers=poi_label&limit=10&access_token=${mapboxgl.accessToken}`,
          );
          const poiJson = await poiQuery.json();
          poiJson.features.forEach((feat: any) => {
            const name = feat.properties.name;
            const category = feat.properties.type || "Landmark";
            if (name && !stops.find((s) => s.name.includes(name))) {
              stops.push({
                name: `${category}: ${name}`,
                coords: feat.geometry.coordinates,
              });
            }
          });
        } catch (e) {
          console.error("POI fetch error", e);
        }
      }

      setLandmarks(stops);

      if (map.current?.getSource("full-route")) {
        (map.current.getSource("full-route") as mapboxgl.GeoJSONSource).setData(
          data.geometry,
        );
      } else {
        map.current?.addSource("full-route", {
          type: "geojson",
          data: data.geometry,
        });
        map.current?.addLayer({
          id: "full-route",
          type: "line",
          source: "full-route",
          paint: {
            "line-color": "#3b82f6",
            "line-width": 5,
            "line-opacity": 0.6,
          },
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (pickup && dropoff) {
      fetchUserDistance();
    }
  }, [pickup, dropoff]);

  const fetchUserDistance = async () => {
    if (!pickup || !dropoff) return;
    setCalcLoading(true);
    try {
      const userQuery = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup[0]},${pickup[1]};${dropoff[0]},${dropoff[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`,
      );
      const userJson = await userQuery.json();
      setUserDistance(userJson.routes[0].distance);

      // Draw trip segment line
      if (map.current?.getSource("user-trip")) {
        (map.current.getSource("user-trip") as mapboxgl.GeoJSONSource).setData(
          userJson.routes[0].geometry,
        );
      } else {
        map.current?.addSource("user-trip", {
          type: "geojson",
          data: userJson.routes[0].geometry,
        });
        map.current?.addLayer({
          id: "user-trip",
          type: "line",
          source: "user-trip",
          paint: { "line-color": "#10b981", "line-width": 6 },
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCalcLoading(false);
    }
  };

  const handlePayAndRequest = async () => {
    if (!user) {
      nav({ to: "/auth" });
      return;
    }
    setSubmitting(true);
    const paystack = new PaystackPop();
    paystack.newTransaction({
      key: "pk_test_efff82b29a7e27495c4fbb92a41516beb1bf1d1b",
      email: user.email || "passenger@rideshare.com",
      amount: Math.round(totalPrice * 100),
      currency: "GHS",
      onSuccess: (t: any) => completeRequest(t.reference),
      onCancel: () => {
        setSubmitting(false);
        toast.error("Cancelled");
      },
      onError: (e: any) => {
        setSubmitting(false);
        toast.error(e.message);
      },
    });
  };

  const completeRequest = async (paymentRef: string) => {
    try {
      const { data, error } = await supabase
        .from("ride_requests")
        .insert({
          route_id: route.id,
          passenger_id: user!.id,
          driver_id: route.driver_id,
          seats_requested: seats,
          pickup_note: note,
          // @ts-expect-error
          payment_status: "paid",
          // @ts-expect-error
          payment_ref: paymentRef,
          // @ts-expect-error
          commission_fee: commission,
          // @ts-expect-error
          total_price: totalPrice,
        })
        .select()
        .single();
      if (error) throw error;
      toast.success("Request sent!");
      nav({ to: "/chat/$requestId", params: { requestId: data.id } });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen">
        <Navbar />
        <p className="p-8">Loading...</p>
      </div>
    );
  if (!route)
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="p-8">
          <p>Not found.</p>
        </div>
      </div>
    );

  const isOwner = user?.id === route.driver_id;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Link
          to="/routes"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to routes
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-6">
            <Card className="overflow-hidden border-none shadow-xl relative">
              <div className="p-4 bg-background border-b flex items-center justify-between">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-primary" />
                  Route Plan
                </h2>
                <div className="flex gap-2">
                  {pickup && dropoff && !confirmed && (
                    <Button
                      size="xs"
                      onClick={() => {
                        setConfirmed(true);
                        setActiveStep(null);
                      }}
                      className="h-7 text-[10px] bg-success hover:bg-success/90"
                    >
                      Confirm Route
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant={activeStep === "pickup" ? "default" : "outline"}
                    onClick={() => {
                      setActiveStep("pickup");
                      setConfirmed(false);
                    }}
                    className="h-7 text-[10px]"
                  >
                    {pickup ? "✓ Pickup" : "Set Pickup"}
                  </Button>
                  <Button
                    size="xs"
                    variant={activeStep === "dropoff" ? "default" : "outline"}
                    onClick={() => {
                      setActiveStep("dropoff");
                      setConfirmed(false);
                    }}
                    className="h-7 text-[10px]"
                  >
                    {dropoff ? "✓ Drop-off" : "Set Drop-off"}
                  </Button>
                </div>
              </div>
              <div className="relative">
                <div
                  ref={mapContainer}
                  className="h-80 w-full"
                  data-step={activeStep}
                />
                {activeStep && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-primary px-4 py-1.5 rounded-full shadow-lg text-[10px] font-bold text-primary-foreground animate-bounce">
                      Click on map to set {activeStep}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6 shadow-sm border-none">
              <div className="flex items-center gap-2 text-xl font-bold">
                <MapPin className="h-6 w-6 text-primary" />
                {route.start_location}{" "}
                <ArrowRight className="h-5 w-5 text-muted-foreground" />{" "}
                {route.end_location}
              </div>
              <p className="mt-3 text-muted-foreground">
                {route.description || "No description provided."}
              </p>

              <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
                <Stat
                  icon={Clock}
                  label="Departure"
                  value={route.departure_time.slice(0, 5)}
                />
                <Stat
                  icon={Users}
                  label="Seats left"
                  value={String(route.available_seats)}
                />
                <Stat
                  icon={Banknote}
                  label="Price"
                  value={`GHS ${Number(route.price_per_seat).toFixed(2)}`}
                />
                <Stat
                  icon={ShieldCheck}
                  label="Driver"
                  value={route.profiles?.verified ? "Verified" : "Unverified"}
                />
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {!isOwner && (
              <Card className="overflow-hidden border-none shadow-2xl bg-background/60 backdrop-blur-xl border border-primary/10">
                <div className="p-6 bg-primary text-primary-foreground">
                  <h2 className="text-xl font-black flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    Secure Booking
                  </h2>
                  <p className="text-xs opacity-80 mt-1">
                    Select your points to see the final price
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Step 1: Pickup */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                        1
                      </div>
                      Pickup Point
                    </Label>
                    <div className="grid gap-2">
                      <select
                        className="w-full h-11 rounded-xl border-primary/20 bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                        onChange={(e) => {
                          const stop = landmarks[Number(e.target.value)];
                          if (stop) {
                            setPickup(stop.coords);
                            pMarker.current
                              ?.setLngLat(stop.coords)
                              .addTo(map.current!);
                            setConfirmed(false);
                          }
                        }}
                        value={landmarks.findIndex(
                          (l) => l.coords[0] === pickup?.[0],
                        )}
                      >
                        <option value="">
                          Select a landmark or click map...
                        </option>
                        {landmarks.map((l, i) => (
                          <option key={i} value={i}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant={
                          activeStep === "pickup" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setActiveStep("pickup")}
                        className="w-full rounded-xl text-xs h-9 border-dashed"
                      >
                        {pickup ? "✓ Point Pinned" : "Pin exactly on Map"}
                      </Button>
                    </div>
                  </div>

                  {/* Step 2: Dropoff */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                        2
                      </div>
                      Destination
                    </Label>
                    <div className="grid gap-2">
                      <select
                        className="w-full h-11 rounded-xl border-primary/20 bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                        onChange={(e) => {
                          const stop = landmarks[Number(e.target.value)];
                          if (stop) {
                            setDropoff(stop.coords);
                            dMarker.current
                              ?.setLngLat(stop.coords)
                              .addTo(map.current!);
                            setConfirmed(false);
                          }
                        }}
                        value={landmarks.findIndex(
                          (l) => l.coords[0] === dropoff?.[0],
                        )}
                      >
                        <option value="">
                          Select a landmark or click map...
                        </option>
                        {landmarks.map((l, i) => (
                          <option key={i} value={i}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant={
                          activeStep === "dropoff" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setActiveStep("dropoff")}
                        className="w-full rounded-xl text-xs h-9 border-dashed"
                      >
                        {dropoff ? "✓ Point Pinned" : "Pin exactly on Map"}
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-primary/10 space-y-4">
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor="seats"
                        className="text-xs font-bold whitespace-nowrap"
                      >
                        Seats:
                      </Label>
                      <Input
                        id="seats"
                        type="number"
                        min={1}
                        max={route.available_seats}
                        value={seats}
                        onChange={(e) => setSeats(Number(e.target.value))}
                        className="h-9 w-20 rounded-lg text-center font-bold"
                      />
                    </div>

                    {/* Pricing Summary */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Banknote className="h-12 w-12" />
                      </div>

                      <div className="flex justify-between items-end mb-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-tighter text-primary">
                            Fare Summary
                          </p>
                          <h3 className="text-2xl font-black">
                            {calcLoading
                              ? "..."
                              : `GHS ${totalPrice.toFixed(2)}`}
                          </h3>
                        </div>
                        <Badge
                          variant="outline"
                          className="bg-background/50 border-primary/20 text-[10px] py-0 px-2 h-5"
                        >
                          {userDistance > 0
                            ? userDistance <= finalFullDist / 2
                              ? "Short Trip"
                              : "Long Trip"
                            : "Select Route"}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-[10px] text-muted-foreground font-medium">
                        <div className="flex justify-between">
                          <span>Segment distance</span>
                          <span className="text-foreground">
                            {(userDistance / 1000).toFixed(1)} km
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Route distance</span>
                          <span className="text-foreground">
                            {(finalFullDist / 1000).toFixed(1)} km
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {pickup && dropoff && !confirmed && (
                      <Button
                        className="w-full h-12 rounded-xl bg-success hover:bg-success/90 text-white font-bold animate-pulse shadow-lg shadow-success/20"
                        onClick={() => {
                          setConfirmed(true);
                          setActiveStep(null);
                        }}
                      >
                        Lock in this Route
                      </Button>
                    )}

                    <Button
                      className={`w-full h-14 rounded-2xl text-lg font-black shadow-2xl transition-all ${confirmed ? "scale-100 shadow-primary/30" : "scale-95 opacity-50 cursor-not-allowed grayscale"}`}
                      disabled={submitting || !confirmed}
                      onClick={handlePayAndRequest}
                    >
                      {submitting
                        ? "Processing..."
                        : confirmed
                          ? "Pay & Book Now"
                          : "Complete Steps Above"}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <Card className="p-6 shadow-xl border-none">
              <h3 className="font-bold mb-4">Driver Profile</h3>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  {route.profiles?.full_name?.charAt(0)}
                </div>
                <div>
                  <div className="font-bold">{route.profiles?.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {route.profiles?.verified
                      ? "✓ Identity Verified"
                      : "Unverified"}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
