import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Link } from "@tanstack/react-router";
import { MapPin, Clock, Users, Banknote } from "lucide-react";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Common Ghana Locations (Fallback Coordinates)
const GHANA_LOCATIONS: Record<string, [number, number]> = {
  Accra: [-0.187, 5.6037],
  Tema: [-0.0164, 5.6685],
  Madina: [-0.1652, 5.6682],
  Legon: [-0.1869, 5.6508],
  Circle: [-0.21, 5.5601],
  Kasoa: [-0.4167, 5.5333],
  Kumasi: [-1.6133, 6.6666],
  "East Legon": [-0.1584, 5.6322],
  Osu: [-0.1837, 5.5539],
  Cantonments: [-0.1741, 5.5786],
};

interface RouteMapProps {
  routes: any[];
}

export function RouteMap({ routes }: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/navigation-night-v1", // Modern dark style
      center: [-0.187, 5.6037], // Accra
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => map.current?.remove();
  }, []);

  useEffect(() => {
    if (!map.current) return;

    // Clear old markers
    markers.current.forEach((m) => m.remove());
    markers.current = [];

    routes.forEach((route) => {
      // Use coordinates from DB if available, else fallback
      const lng =
        route.start_lng ||
        GHANA_LOCATIONS[
          Object.keys(GHANA_LOCATIONS).find((k) =>
            route.start_location.includes(k),
          ) || "Accra"
        ][0];
      const lat =
        route.start_lat ||
        GHANA_LOCATIONS[
          Object.keys(GHANA_LOCATIONS).find((k) =>
            route.start_location.includes(k),
          ) || "Accra"
        ][1];

      const el = document.createElement("div");
      el.className =
        "flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-lg border-2 border-white cursor-pointer hover:scale-110 transition-transform";
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h10c0 .9.7 1.6 1.6 1.6s1.6-.7 1.6-1.6c0-.9-.7-1.6-1.6-1.6s-1.6.7-1.6 1.6c0 .9.7 1.6 1.6 1.6s1.6-.7 1.6-1.6z"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/></svg>`;

      const popupNode = document.createElement("div");
      popupNode.className = "p-2 w-48 font-sans";
      popupNode.innerHTML = `
        <div class="font-bold text-sm mb-1">${route.start_location} → ${route.end_location}</div>
        <div class="flex justify-between text-xs text-muted-foreground mb-2">
          <span>🕒 ${route.departure_time.slice(0, 5)}</span>
          <span class="text-primary font-bold">GHS ${Number(route.price_per_seat).toFixed(2)}</span>
        </div>
        <button class="w-full bg-primary text-white text-[10px] py-1.5 rounded font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors">
          View Ride
        </button>
      `;

      popupNode.querySelector("button")?.addEventListener("click", () => {
        window.location.href = `/routes/${route.id}`;
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setDOMContent(popupNode))
        .addTo(map.current!);

      markers.current.push(marker);
    });

    if (routes.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      routes.forEach((r) => {
        const lng =
          r.start_lng ||
          GHANA_LOCATIONS[
            Object.keys(GHANA_LOCATIONS).find((k) =>
              r.start_location.includes(k),
            ) || "Accra"
          ][0];
        const lat =
          r.start_lat ||
          GHANA_LOCATIONS[
            Object.keys(GHANA_LOCATIONS).find((k) =>
              r.start_location.includes(k),
            ) || "Accra"
          ][1];
        bounds.extend([lng, lat]);
      });
      map.current.fitBounds(bounds, { padding: 100, maxZoom: 14 });
    }
  }, [routes]);

  return (
    <Card className="relative h-[600px] w-full overflow-hidden border-none shadow-2xl rounded-2xl group">
      <div ref={mapContainer} className="h-full w-full" />

      {/* Map Overlay Controls */}
      <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
        <Badge className="bg-background/90 px-4 py-2 text-foreground backdrop-blur-xl border-white/10 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="font-bold tracking-tight">
              {routes.length} Live Routes
            </span>
          </div>
        </Badge>
      </div>
    </Card>
  );
}
