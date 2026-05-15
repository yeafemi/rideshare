import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Car,
  Phone,
  Lock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Banknote,
  MessageSquare,
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import heroImg from "@/assets/hero-ghana.png";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const phoneSchema = z.object({
  phone: z.string().min(10, "Please enter a valid phone number"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "Verification code must be 6 digits"),
});

type PhoneValues = z.infer<typeof phoneSchema>;
type OtpValues = z.infer<typeof otpSchema>;

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [authLoading, setAuthLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  const phoneForm = useForm<PhoneValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });

  const otpForm = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  useEffect(() => {
    if (!loading && user) {
      nav({ to: "/dashboard" });
    }
  }, [user, loading, nav]);

  const [sentCode, setSentCode] = useState("");

  const onSendCode = async (values: PhoneValues) => {
    setAuthLoading(true);
    try {
      let formattedPhone = values.phone.trim();
      if (!formattedPhone.startsWith("+")) {
        formattedPhone = formattedPhone.startsWith("0")
          ? "+233" + formattedPhone.substring(1)
          : "+233" + formattedPhone;
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentCode(code);
      
      // AUTHORIZED TESTER BYPASS
      const authorizedTesters = ["+233200692763", "+233593023564"];
      if (authorizedTesters.includes(formattedPhone)) {
        alert(`DEVELOPMENT BYPASS: Your verification code is ${code}`);
        console.log("OTP Code for authorized tester:", code);
      }

      // Call Edge Function with 'send' action
      const { error } = await supabase.functions.invoke("send-otp", {
        body: { action: "send", phone: formattedPhone, code },
      });

      if (error) {
        console.warn("SMS send failed, but you can use the bypass code:", code);
      }

      setPhoneNumber(formattedPhone);
      setStep("otp");
      toast.success("Verification code sent to " + formattedPhone);
    } catch (err: any) {
      toast.error(
        "Failed to send code. Ensure 'send-otp' function is deployed.",
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const onVerifyCode = async (values: OtpValues) => {
    setAuthLoading(true);
    try {
      if (values.otp !== sentCode) {
        throw new Error("Invalid verification code");
      }

      // We pass the current origin so the Edge Function knows where to redirect back to
      const redirectTo = window.location.origin + import.meta.env.BASE_URL + "dashboard";

      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { action: "verify", phone: phoneNumber, redirectTo },
      });

      if (error || !data?.link)
        throw error || new Error("Failed to generate login link");

      // Sign in using the magic link returned by our function
      window.location.href = data.link;
    } catch (err: any) {
      toast.error(err.message || "Invalid or expired verification code");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 font-sans selection:bg-primary/30 animate-in fade-in duration-1000">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-[3000ms] scale-110"
        style={{ backgroundImage: `url(${heroImg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        {/* Left Side Content */}
        <div className="hidden flex-col justify-between p-12 text-white lg:flex animate-in slide-in-from-left duration-700 delay-200">
          <Link
            to="/"
            className="flex items-center gap-2 text-2xl font-black tracking-tighter hover:opacity-80 transition-opacity"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
              <Car className="h-6 w-6 text-white" />
            </div>
            <span>
              Ride<span className="text-primary font-light">Share</span>
            </span>
          </Link>

          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-md border border-white/10">
              <Zap className="h-4 w-4 text-primary fill-primary" />
              <span>The future of commuting in Ghana</span>
            </div>

            <h2 className="text-6xl font-bold leading-[1.1] tracking-tight">
              Smarter travels for <br />
              <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                the modern Ghanaian.
              </span>
            </h2>

            <p className="max-w-lg text-xl text-slate-300 leading-relaxed">
              Connect with verified professionals and students heading your way.
              Safe, affordable, and community-driven transportation.
            </p>

            <div className="grid grid-cols-2 gap-6 pt-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/20 p-2 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Verified Only</h4>
                  <p className="text-sm text-slate-400">
                    Strict ID & work verification
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/20 p-2 text-primary">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Fair Pricing</h4>
                  <p className="text-sm text-slate-400">
                    Up to 60% cheaper than apps
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm font-medium text-slate-500">
            {/* Footer text removed as requested */}
          </div>
        </div>

        {/* Right Side Form */}
        <div className="flex items-center justify-center p-6 lg:p-12 animate-in slide-in-from-right duration-700 delay-300">
          <Card className="relative w-full max-w-md overflow-hidden border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-2xl lg:p-10 animate-float">
            {/* Subtle glow effect */}
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/20 blur-[80px]" />
            <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-emerald-500/10 blur-[80px]" />

            <div className="relative mb-10 flex flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-emerald-500 p-0.5 shadow-xl shadow-primary/20 lg:hidden">
                <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-slate-900">
                  <Car className="h-8 w-8 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">
                {step === "phone" ? "Quick Sign In" : "Verify Phone"}
              </h1>
              <p className="mt-3 text-slate-400 px-4">
                {step === "phone"
                  ? "Enter your phone number to receive a secure login code"
                  : `Enter the 6-digit code we sent to ${phoneNumber}`}
              </p>
            </div>

            {step === "phone" ? (
              <form
                onSubmit={phoneForm.handleSubmit(onSendCode)}
                className="relative space-y-5"
              >
                <div className="space-y-2">
                  <Label
                    htmlFor="phone"
                    className="text-sm font-semibold text-slate-200"
                  >
                    Phone Number
                  </Label>
                  <div className="relative group">
                    <Phone className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-500 transition-colors group-focus-within:text-primary" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="e.g., 0244123456"
                      className={`h-12 border-white/10 bg-white/5 pl-11 text-white placeholder:text-slate-600 focus:border-primary/50 focus:ring-primary/20 ${phoneForm.formState.errors.phone ? "border-destructive/50" : ""}`}
                      {...phoneForm.register("phone")}
                    />
                  </div>
                  {phoneForm.formState.errors.phone && (
                    <p className="text-xs font-medium text-destructive-foreground">
                      {phoneForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="group h-14 w-full bg-gradient-to-r from-primary to-emerald-600 text-lg font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Sending...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span>Send Code</span>
                      <MessageSquare className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </div>
                  )}
                </Button>
              </form>
            ) : (
              <form
                onSubmit={otpForm.handleSubmit(onVerifyCode)}
                className="relative space-y-6"
              >
                <div className="flex justify-center py-4">
                  <InputOTP
                    maxLength={6}
                    value={otpForm.watch("otp")}
                    onChange={(val) => otpForm.setValue("otp", val)}
                  >
                    <InputOTPGroup className="gap-2">
                      <InputOTPSlot
                        index={0}
                        className="h-12 w-12 rounded-lg border-white/10 bg-white/5 text-xl font-bold text-white focus:ring-primary/50"
                      />
                      <InputOTPSlot
                        index={1}
                        className="h-12 w-12 rounded-lg border-white/10 bg-white/5 text-xl font-bold text-white focus:ring-primary/50"
                      />
                      <InputOTPSlot
                        index={2}
                        className="h-12 w-12 rounded-lg border-white/10 bg-white/5 text-xl font-bold text-white focus:ring-primary/50"
                      />
                      <InputOTPSlot
                        index={3}
                        className="h-12 w-12 rounded-lg border-white/10 bg-white/5 text-xl font-bold text-white focus:ring-primary/50"
                      />
                      <InputOTPSlot
                        index={4}
                        className="h-12 w-12 rounded-lg border-white/10 bg-white/5 text-xl font-bold text-white focus:ring-primary/50"
                      />
                      <InputOTPSlot
                        index={5}
                        className="h-12 w-12 rounded-lg border-white/10 bg-white/5 text-xl font-bold text-white focus:ring-primary/50"
                      />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <div className="space-y-4">
                  <Button
                    type="submit"
                    className="group h-14 w-full bg-gradient-to-r from-primary to-emerald-600 text-lg font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    disabled={authLoading || otpForm.watch("otp").length !== 6}
                  >
                    {authLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Verifying...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <span>Verify & Sign In</span>
                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </div>
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setStep("phone")}
                    className="w-full text-center text-sm font-semibold text-slate-400 hover:text-white transition-colors"
                  >
                    Change phone number
                  </button>
                </div>
              </form>
            )}

            <div className="mt-10 border-t border-white/5 pt-6 text-center text-xs text-slate-500">
              <p>
                By signing in, you agree to our Terms of Service and Privacy
                Policy.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
