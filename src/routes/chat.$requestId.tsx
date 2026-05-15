import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Send,
  MapPin,
  ArrowRight,
  MessageCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Share2,
  ShieldAlert,
  Navigation,
  Play,
} from "lucide-react";
import { MapboxView } from "@/components/MapboxView";
import { RatingModal } from "@/components/RatingModal";
import { toast } from "sonner";

export const Route = createFileRoute("/chat/$requestId")({
  component: Chat,
});

const QUICK = [
  "I'm at the pickup point",
  "On my way 🚗",
  "Running 5 min late",
  "Arrived 👋",
];

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
};

function Chat() {
  const { requestId } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [request, setRequest] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [showRating, setShowRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [otp, setOtp] = useState("");
  const [dist, setDist] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  const loadData = async () => {
    if (!user) return;
    const { data: req } = await supabase
      .from("ride_requests")
      .select(
        "*, routes(start_location, end_location, start_lat, start_lng, end_lat, end_lng), driver:driver_id(full_name), passenger:passenger_id(full_name)",
      )
      .eq("id", requestId)
      .maybeSingle();
    setRequest(req);

    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at");
    setMessages(msgs ?? []);

    const { data: rating } = await supabase
      .from("ratings")
      .select("id")
      .eq("request_id", requestId)
      .eq("rater_id", user.id)
      .maybeSingle();
    setHasRated(!!rating);
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel(`chat-${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen for status changes too
          schema: "public",
          table: "ride_requests",
          filter: `id=eq.${requestId}`,
        },
        (payload) => setRequest((p: any) => ({ ...p, ...payload.new })),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => setMessages((p) => [...p, payload.new]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!user || !request || request.status !== "accepted" && request.status !== "en_route") return;

    const isDriver = user.id === request.driver_id;


    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const updateObj: any = isDriver 
          ? { driver_lat: latitude, driver_lng: longitude }
          : { passenger_lat: latitude, passenger_lng: longitude };

        await supabase
          .from("ride_requests")
          .update(updateObj)
          .eq("id", requestId);
      },
      (err) => console.error("GPS Error:", err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [user, request?.status, requestId]);

  // Update distance live
  useEffect(() => {
    if (request?.driver_lat && request?.passenger_lat) {
      const d = getDistance(
        request.driver_lat,
        request.driver_lng,
        request.passenger_lat,
        request.passenger_lng
      );
      setDist(d);
    }
  }, [request?.driver_lat, request?.driver_lng, request?.passenger_lat, request?.passenger_lng]);

  const send = async (content: string) => {
    if (!user || !content.trim()) return;
    const { error } = await supabase
      .from("messages")
      .insert({ request_id: requestId, sender_id: user.id, content });
    if (!error) setText("");
  };

  const updateStatus = async (status: string) => {
    const { error } = await supabase
      .from("ride_requests")
      .update({ status: status as any })
      .eq("id", requestId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Ride ${status}`);
    }
  };

  const verifyAndStart = async () => {
    if (otp !== request.pickup_otp) {
      toast.error("Incorrect Pickup Code");
      return;
    }
    const { error } = await supabase
      .from("ride_requests")
      .update({ driver_confirmed_at: new Date().toISOString() })
      .eq("id", requestId);
    
    if (error) toast.error(error.message);
    else toast.success("Code Verified! Waiting for passenger...");
  };

  const confirmInCar = async () => {
    const { error } = await supabase
      .from("ride_requests")
      .update({ passenger_confirmed_at: new Date().toISOString() })
      .eq("id", requestId);
    
    if (error) toast.error(error.message);
    else toast.success("Confirmation sent! Waiting for driver...");
  };

  // Auto-start if both confirmed
  useEffect(() => {
    if (request?.driver_confirmed_at && request?.passenger_confirmed_at && request.status === "accepted") {
      updateStatus("en_route");
    }
  }, [request?.driver_confirmed_at, request?.passenger_confirmed_at]);

  if (!user || !request)
    return (
      <div className="min-h-screen">
        <Navbar />
        <p className="p-8 text-muted-foreground">Loading...</p>
      </div>
    );

  const otherName =
    user.id === request.driver_id
      ? request.passenger?.full_name
      : request.driver?.full_name;

  const isDriver = user.id === request.driver_id;

  return (
    <div className="flex h-screen flex-col bg-[url('/src/assets/hero-road.jpg')] bg-cover bg-center bg-no-repeat bg-fixed relative">
      <div className="absolute inset-0 bg-background/90 backdrop-blur-3xl -z-10" />
      <Navbar />

      {/* Header */}
      <div className="border-b bg-background/60 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shadow-md">
              {otherName?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div>
              <div className="font-semibold text-lg">{otherName ?? "Chat"}</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1 text-primary">
                  <MapPin className="h-3 w-3" />{" "}
                  {request.routes?.start_location}
                </span>
                <ArrowRight className="h-3 w-3 opacity-50" />
                <span className="flex items-center gap-1">
                  {request.routes?.end_location}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="hover:bg-muted/50 rounded-full"
          >
            <Link to="/dashboard">Back</Link>
          </Button>
        </div>

        {/* Status Bar */}
        <div className="bg-primary/5 border-t border-primary/10 px-4 py-2">
          <div className="mx-auto max-w-3xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <StatusIcon status={request.status} />
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {request.status.replace("_", " ")}
              </span>
            </div>

            {isDriver && (
              <div className="flex gap-2">
                {request.status === "accepted" && (
                  <Button
                    size="xs"
                    className="h-7 px-3 text-[10px] bg-blue-600 hover:bg-blue-700"
                    onClick={() => updateStatus("en_route")}
                  >
                    <Play className="h-3 w-3 mr-1" /> Start Ride
                  </Button>
                )}
                {request.status === "en_route" && (
                  <Button
                    size="xs"
                    className="h-7 px-3 text-[10px] bg-success hover:bg-success/90"
                    onClick={() => updateStatus("completed")}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                  </Button>
                )}
              </div>
            )}
            
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="xs"
                className="h-7 w-7 p-0 rounded-full hover:bg-primary/10 text-primary"
                onClick={() => {
                  const url = window.location.origin + "/share/" + requestId;
                  navigator.clipboard.writeText(url);
                  toast.success("Shareable trip link copied!");
                }}
              >
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden relative">
        {request.status === "en_route" && (
          <div className="px-4 pt-4 h-48 shrink-0 relative group">
            <MapboxView
              start={{
                lat: request.routes?.start_lat,
                lng: request.routes?.start_lng,
              }}
              end={{
                lat: request.routes?.end_lat,
                lng: request.routes?.end_lng,
              }}
              driver={{ lat: request.driver_lat, lng: request.driver_lng }}
              className="h-full w-full rounded-2xl shadow-lg border border-primary/10 overflow-hidden"
            />
            <div className="absolute top-6 right-6 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <Button size="xs" variant="secondary" className="h-7 text-[10px] bg-white/80 backdrop-blur shadow-sm">
                 <Navigation className="h-3 w-3 mr-1" /> Track Driver
               </Button>
            </div>
          </div>
        )}

        {/* Verification Step for accepted rides */}
        {request.status === "accepted" && (
          <div className="px-4 pt-4 shrink-0">
            <Card className="p-4 border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center text-center animate-in zoom-in duration-500">
               <div className="flex items-center gap-2 mb-2">
                 <ShieldAlert className="h-5 w-5 text-primary opacity-80" />
                 <h4 className="text-sm font-black uppercase tracking-tighter">Safe Pickup Verification</h4>
               </div>
               
               {dist !== null && (
                 <div className={`mb-4 px-3 py-1 rounded-full text-[10px] font-bold ${dist > 50 ? "bg-amber-100 text-amber-700" : "bg-success/10 text-success"}`}>
                    {dist > 50 ? `Move closer: ${Math.round(dist)}m away` : `Proximity Verified: ${Math.round(dist)}m`}
                 </div>
               )}

               {!isDriver ? (
                 <div className="space-y-4 w-full">
                    <div className="bg-background rounded-xl p-4 border shadow-sm">
                       <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Your Pickup Code</p>
                       <div className="text-3xl font-black tracking-widest text-primary">{request.pickup_otp || "------"}</div>
                       <p className="text-[10px] text-muted-foreground mt-2">Share this with the driver only when you are at the vehicle.</p>
                    </div>
                    <Button 
                      className="w-full h-11 font-bold shadow-lg" 
                      disabled={dist === null || dist > 50 || !!request.passenger_confirmed_at}
                      onClick={confirmInCar}
                    >
                      {request.passenger_confirmed_at ? "Waiting for Driver..." : "Confirm I'm in the Car"}
                    </Button>
                 </div>
               ) : (
                 <div className="space-y-4 w-full">
                    <div className="bg-background rounded-xl p-4 border shadow-sm">
                       <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2">Enter Pickup Code</p>
                       <Input 
                         value={otp}
                         onChange={(e) => setOtp(e.target.value)}
                         placeholder="000000"
                         className="text-center text-2xl font-black tracking-widest h-12"
                         maxLength={6}
                       />
                    </div>
                    <Button 
                      className="w-full h-11 font-bold shadow-lg" 
                      disabled={dist === null || dist > 50 || otp.length < 6 || !!request.driver_confirmed_at}
                      onClick={verifyAndStart}
                    >
                      {request.driver_confirmed_at ? "Waiting for Passenger..." : "Verify & Start Trip"}
                    </Button>
                 </div>
               )}
            </Card>
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6 scroll-smooth">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <div className="rounded-2xl bg-background/50 backdrop-blur-sm p-6 text-center shadow-sm border border-white/10">
                <MessageCircle className="mx-auto h-10 w-10 text-primary opacity-50 mb-3" />
                <p className="text-sm font-medium">No messages yet.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Send a message to coordinate your ride.
                </p>
              </div>
            </div>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === user.id;
            return (
              <div
                key={m.id}
                className={`flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300 ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`relative max-w-[75%] px-4 py-2.5 text-[15px] shadow-sm ${
                    mine
                      ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                      : "bg-card border border-border/50 rounded-2xl rounded-tl-sm"
                  }`}
                >
                  {m.content}
                  <span
                    className={`block text-[10px] mt-1 opacity-70 text-right ${mine ? "text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* SOS Floating Button */}
        {request.status === "en_route" && (
          <div className="absolute bottom-32 right-4 z-20 flex flex-col items-end gap-3">
             <div className="flex flex-col items-center group">
                <div className="mb-2 px-3 py-1 bg-destructive text-white text-[10px] font-black rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                  SOS EMERGENCY
                </div>
                <Button
                  size="icon"
                  className="h-14 w-14 rounded-full bg-destructive hover:bg-destructive/90 shadow-2xl shadow-destructive/40 border-4 border-white/20 animate-pulse"
                  onClick={async () => {
                    const ok = confirm("🚨 ACTIVATE SOS?\n\nThis will send your LIVE location to emergency contacts and notify our safety team.");
                    if (ok) {
                      const { error } = await supabase.from("emergency_events").insert({
                        request_id: requestId,
                        triggered_by: user.id,
                        location_lat: request.driver_lat,
                        location_lng: request.driver_lng,
                      });
                      if (error) toast.error("SOS failed to log: " + error.message);
                      else toast.error("SOS ACTIVATED. HELP IS ON THE WAY.", { duration: 10000 });
                    }
                  }}
                >
                  <AlertTriangle className="h-7 w-7" />
                </Button>
             </div>
          </div>
        )}

        {/* Input Area */}
        <div className="bg-background/80 backdrop-blur-xl border-t border-white/10 p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-all active:scale-95"
              >
                {q}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
            className="flex gap-2 items-center"
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message..."
              className="rounded-full h-12 px-5 bg-background shadow-inner border-primary/20 focus-visible:ring-primary"
            />
            <Button
              type="submit"
              size="icon"
              className="h-12 w-12 rounded-full shrink-0 shadow-md transition-transform hover:scale-105 active:scale-95"
              disabled={!text.trim()}
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </div>

        {request.status === "completed" && !hasRated && (
          <RatingModal
            requestId={requestId}
            raterId={user.id}
            rateeId={user.id === request.driver_id ? request.passenger_id : request.driver_id}
            onSuccess={() => setHasRated(true)}
          />
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "en_route":
      return <Navigation className="h-3.5 w-3.5 text-blue-500 animate-pulse" />;
    case "accepted":
      return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
    case "completed":
      return <CheckCircle2 className="h-3.5 w-3.5 text-primary" />;
    default:
      return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}
