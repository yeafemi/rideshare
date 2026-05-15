import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, MapPin, X } from "lucide-react";

interface DestinationSearchProps {
  onSelect: (coords: [number, number], name: string) => void;
  placeholder?: string;
}

export function DestinationSearch({
  onSelect,
  placeholder = "Where are you going?",
}: DestinationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const token = import.meta.env.VITE_MAPBOX_TOKEN;
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=gh&limit=5`,
        );
        const data = await res.json();
        setResults(data.features || []);
        setOpen(true);
      } catch (err) {
        console.error("Geocoding error", err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 3 && setOpen(true)}
          className="h-12 border-none pl-12 text-lg focus-visible:ring-0 bg-background"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute right-4 top-3.5"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border bg-background p-2 shadow-2xl animate-in fade-in slide-in-from-top-2">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                onSelect(r.center, r.text);
                setQuery(r.text);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold truncate">{r.text}</span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {r.place_name}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
