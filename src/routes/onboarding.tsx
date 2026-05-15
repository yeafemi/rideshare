import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { User, Car, Mail } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const onboardingSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  workEmail: z.string().email("Please enter a valid work or student email"),
  schoolName: z.string().optional(),
  bio: z.string().optional(),
  carMake: z.string().optional(),
  carModel: z.string().optional(),
  carColor: z.string().optional(),
  plateNumber: z.string().optional(),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user, loading: authLoading, isDriver } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      fullName: "",
      workEmail: "",
      schoolName: "",
      bio: "",
      carMake: "",
      carModel: "",
      carColor: "",
      plateNumber: "",
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      nav({ to: "/auth" });
    }
  }, [user, authLoading, nav]);

  const onSubmit = async (values: OnboardingValues) => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Update or Create Profile
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: values.fullName,
        work_email: values.workEmail,
        school_name: values.schoolName || null,
        bio: values.bio || null,
        trust_score: 100, // Initial trust score
      });

      if (profileError) throw profileError;

      // 2. If Driver, setup Car record
      if (isDriver) {
        if (!values.carMake || !values.carModel || !values.plateNumber) {
          throw new Error("Please complete all vehicle details");
        }

        const { error: carError } = await supabase.from("cars").upsert({
          owner_id: user.id,
          make: values.carMake,
          model: values.carModel,
          color: values.carColor,
          plate_number: values.plateNumber,
        });

        if (carError) throw carError;
      }

      toast.success("Profile setup complete!");
      nav({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "An error occurred during setup");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-lg font-medium">Loading...</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Complete your profile
          </h1>
          <p className="mt-2 text-muted-foreground">
            Just a few more details to get you started on RideShare.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card className="p-8 shadow-sm border-none">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <User className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold">Personal Information</h2>
            </div>

            <div className="grid gap-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="Kwame Mensah"
                  className={errors.fullName ? "border-destructive" : ""}
                  {...register("fullName")}
                />
                {errors.fullName && (
                  <p className="text-xs text-destructive">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="workEmail">Work or Student Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="workEmail"
                    type="email"
                    placeholder="kwame@company.com"
                    className={`pl-10 ${errors.workEmail ? "border-destructive" : ""}`}
                    {...register("workEmail")}
                  />
                </div>
                {errors.workEmail ? (
                  <p className="text-xs text-destructive">
                    {errors.workEmail.message}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Used for verification with your community.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="schoolName">
                  University/Institution (Optional)
                </Label>
                <Input
                  id="schoolName"
                  placeholder="e.g. University of Ghana"
                  {...register("schoolName")}
                />
                <p className="text-xs text-muted-foreground">
                  Get a student badge if you use your school email.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio (Optional)</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell others a bit about yourself..."
                  className="min-h-[100px]"
                  {...register("bio")}
                />
              </div>
            </div>
          </Card>

          {isDriver && (
            <Card className="p-8 shadow-sm border-none">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                  <Car className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-semibold">Vehicle Details</h2>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="carMake">Car Brand (Make)</Label>
                  <Input
                    id="carMake"
                    placeholder="Toyota"
                    {...register("carMake")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carModel">Model</Label>
                  <Input
                    id="carModel"
                    placeholder="Camry"
                    {...register("carModel")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carColor">Vehicle Color</Label>
                  <Input
                    id="carColor"
                    placeholder="Silver"
                    {...register("carColor")}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="plateNumber">Plate Number</Label>
                  <Input
                    id="plateNumber"
                    placeholder="GW-1234-23"
                    {...register("plateNumber")}
                  />
                </div>
              </div>
            </Card>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-lg font-bold shadow-md"
            disabled={loading}
          >
            {loading ? "Saving..." : "Start Riding"}
          </Button>
        </form>
      </div>
    </div>
  );
}
