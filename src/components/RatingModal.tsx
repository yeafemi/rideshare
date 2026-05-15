import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, ThumbsUp, Car, Clock, ShieldCheck, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface RatingModalProps {
  requestId: string;
  raterId: string;
  rateeId: string;
  onSuccess: () => void;
}

export function RatingModal({ requestId, raterId, rateeId, onSuccess }: RatingModalProps) {
  const [stars, setStars] = useState(5);
  const [metrics, setMetrics] = useState({
    punctuality: 5,
    driving: 5,
    cleanliness: 5,
    communication: 5,
  });
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from("ratings").insert({
        request_id: requestId,
        rater_id: raterId,
        ratee_id: rateeId,
        stars,
        comment,
        punctuality: metrics.punctuality,
        driving_behavior: metrics.driving,
        cleanliness: metrics.cleanliness,
        communication: metrics.communication,
      });

      if (error) throw error;

      // Update user trust score (simplified logic)
      const avgMetrics = (metrics.punctuality + metrics.driving + metrics.cleanliness + metrics.communication) / 4;
      const scoreImpact = (stars + avgMetrics) / 2;
      
      // Fetch current score
      const { data: profile } = await supabase.from("profiles").select("trust_score").eq("id", rateeId).single();
      if (profile) {
        const newScore = Math.min(100, Math.max(0, (profile.trust_score + scoreImpact) / 1.05));
        await supabase.from("profiles").update({ trust_score: Math.round(newScore) }).eq("id", rateeId);
      }

      toast.success("Thank you for your feedback!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-background rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
            <ThumbsUp className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black">How was your ride?</h2>
          <p className="text-sm text-muted-foreground mt-1">Your feedback helps keep the community safe.</p>
        </div>

        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => setStars(s)}
              className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all ${
                s <= stars ? "bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Star className={`h-6 w-6 ${s <= stars ? "fill-current" : ""}`} />
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <MetricControl 
            icon={Clock} 
            label="Punctuality" 
            value={metrics.punctuality} 
            onChange={(v) => setMetrics(m => ({...m, punctuality: v}))} 
          />
          <MetricControl 
            icon={Car} 
            label="Driving" 
            value={metrics.driving} 
            onChange={(v) => setMetrics(m => ({...m, driving: v}))} 
          />
          <MetricControl 
            icon={ShieldCheck} 
            label="Cleanliness" 
            value={metrics.cleanliness} 
            onChange={(v) => setMetrics(m => ({...m, cleanliness: v}))} 
          />
          <MetricControl 
            icon={MessageSquare} 
            label="Comms" 
            value={metrics.communication} 
            onChange={(v) => setMetrics(m => ({...m, communication: v}))} 
          />
        </div>

        <div className="space-y-2 mb-8">
          <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Comments (Optional)</Label>
          <Textarea 
            placeholder="Share more details about your experience..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="rounded-2xl bg-muted/30 border-none focus-visible:ring-primary min-h-[100px]"
          />
        </div>

        <Button 
          className="w-full h-14 rounded-2xl text-lg font-black shadow-xl shadow-primary/20"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Submit Feedback"}
        </Button>
      </div>
    </Card>
  );
}

function MetricControl({ icon: Icon, label, value, onChange }: any) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter opacity-70">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(s => (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`h-6 flex-1 rounded-md transition-all ${
              s <= value ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
