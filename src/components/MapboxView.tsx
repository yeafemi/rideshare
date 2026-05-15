import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface MapboxViewProps {
  start?: { lat: number; lng: number };
  end?: { lat: number; lng: number };
  driver?: { lat: number; lng: number };
  className?: string;
}

export const MapboxView: React.FC<MapboxViewProps> = ({
  start,
  end,
  driver,
  className,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);
  const [eta, setEta] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current || !start || !end) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11", // Sleek dark mode
      center: [start.lng, start.lat],
      zoom: 13,
      pitch: 45, // Add 3D perspective
    });

    map.current.on("load", async () => {
      // 1. Fetch Route from Mapbox Directions API
      const query = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&access_token=${mapboxgl.accessToken}`,
      );
      const json = await query.json();
      const data = json.routes[0];
      const route = data.geometry.coordinates;

      // Calculate ETA
      const duration = Math.round(data.duration / 60);
      setEta(`${duration} min`);

      // 2. Add Route Source
      map.current?.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: route,
          },
        },
      });

      // 3. Add Layers (Grey Background + Blue Progress)
      map.current?.addLayer({
        id: "route-bg",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#4b5563",
          "line-width": 6,
          "line-opacity": 0.4,
        },
      });

      map.current?.addLayer({
        id: "route-progress",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#3b82f6",
          "line-width": 6,
          "line-blur": 2,
        },
      });

      // Fit bounds
      const bounds = new mapboxgl.LngLatBounds();
      route.forEach((coord: any) => bounds.extend(coord));
      map.current?.fitBounds(bounds, { padding: 40 });
    });

    // Markers
    new mapboxgl.Marker({ color: "#10b981", scale: 0.8 }) // Start
      .setLngLat([start.lng, start.lat])
      .addTo(map.current);

    new mapboxgl.Marker({ color: "#ef4444", scale: 0.8 }) // End
      .setLngLat([end.lng, end.lat])
      .addTo(map.current);

    // Custom Car Marker
    const el = document.createElement("div");
    el.className = "car-marker";
    el.innerHTML = "🚗";
    el.style.fontSize = "24px";
    el.style.transition = "all 1s linear";

    driverMarker.current = new mapboxgl.Marker(el)
      .setLngLat([driver?.lng || start.lng, driver?.lat || start.lat])
      .addTo(map.current);

    return () => map.current?.remove();
  }, [start?.lat, start?.lng, end?.lat, end?.lng]);

  // Update Driver Location
  useEffect(() => {
    if (driver && driverMarker.current && map.current) {
      driverMarker.current.setLngLat([driver.lng, driver.lat]);

      // Update camera if needed
      map.current.easeTo({
        center: [driver.lng, driver.lat],
        duration: 2000,
      });

      // Note: Full line splitting logic would require @turf/turf
      // but we can simulate it by updating the 'route-progress' source data
      // if we had the remaining coordinates.
    }
  }, [driver?.lat, driver?.lng]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl shadow-2xl">
      <div ref={mapContainer} className={`h-full w-full ${className}`} />

      {/* ETA Overlay */}
      {eta && (
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center bg-background/80 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-lg animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Live Tracking
            </span>
          </div>
          <div className="text-sm font-bold">
            ETA: <span className="text-blue-500">{eta}</span>
          </div>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .car-marker {
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
          z-index: 50;
        }
      `,
        }}
      />
    </div>
  );
};
