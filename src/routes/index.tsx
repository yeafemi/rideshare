import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  Search,
  Car,
  ShieldCheck,
  Phone,
  MapPin,
  Users,
  TrendingDown,
  Clock,
} from "lucide-react";
import heroImg from "@/assets/hero-road.jpg";
import { HeroSlider } from "@/components/HeroSlider";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img
            src={heroImg}
            alt="Accra road at sunset"
            width={1600}
            height={1100}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/20" />
        </div>
        <div className="mx-auto max-w-[90rem] px-6 py-16 md:py-32">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-[1.2fr_0.8fr]">
            {/* Left side: Text */}
            <div className="animate-in fade-in slide-in-from-left-8 duration-1000">
              <h1 className="text-4xl font-extrabold leading-[1.1] md:text-5xl lg:text-6xl xl:text-7xl tracking-tight">
                <span className="block whitespace-nowrap">
                  Stop driving alone.
                </span>
                <span className="block mt-2 whitespace-nowrap bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
                  Share your route.
                </span>
                <span className="block mt-2 whitespace-nowrap">
                  Save money daily.
                </span>
              </h1>
              <p className="mt-8 max-w-2xl text-lg text-muted-foreground/90 md:text-xl leading-relaxed">
                Connect with trusted commuters going your way — no surge
                pricing, no stress. Join the movement and cut fuel costs by up
                to 40% every month.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Button
                  size="lg"
                  className="h-14 px-8 text-lg font-bold rounded-2xl shadow-[var(--shadow-elevated)] hover:scale-105 transition-transform"
                  asChild
                >
                  <Link to="/routes">
                    <Search className="h-5 w-5" /> Find My Route
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 text-lg font-semibold rounded-2xl bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-all"
                  asChild
                >
                  <Link to="/routes/new">
                    <Car className="h-5 w-5" /> Offer a Ride
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right side: Slider (Reduced size by 30%) */}
            <div className="flex justify-center lg:justify-end animate-in fade-in slide-in-from-right-8 duration-1000">
              <div className="w-full max-w-[20rem] md:max-w-[24rem] lg:max-w-[26rem] drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)]">
                <HeroSlider />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-10 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              t: "Verified commuters",
              d: "From workplaces, churches, and schools",
            },
            {
              icon: Phone,
              t: "Phone verification",
              d: "Every account confirmed by phone",
            },
            {
              icon: Users,
              t: "Community trust",
              d: "Optional company or school email check",
            },
          ].map((x) => (
            <div key={x.t} className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <x.icon className="h-5 w-5" />
              </span>
              <div>
                <div className="font-semibold">{x.t}</div>
                <div className="text-sm text-muted-foreground">{x.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">How it works</h2>
          <p className="mt-2 text-muted-foreground">
            Three simple steps to your daily ride.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              n: "01",
              icon: MapPin,
              t: "Set your route",
              d: "Tell us where you start, where you end, and when.",
            },
            {
              n: "02",
              icon: Users,
              t: "Match with commuters",
              d: "We connect you with people going your way at your time.",
            },
            {
              n: "03",
              icon: TrendingDown,
              t: "Share & split costs",
              d: "Chat, confirm, ride — and split fuel fairly.",
            },
          ].map((x) => (
            <div
              key={x.n}
              className="group rounded-2xl border bg-[var(--gradient-card)] p-6 shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <x.icon className="h-6 w-6" />
                </span>
                <span className="text-2xl font-bold text-muted-foreground/40">
                  {x.n}
                </span>
              </div>
              <h3 className="mt-5 text-xl font-semibold">{x.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Value props */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-16 md:grid-cols-3">
          {[
            {
              stat: "40%",
              l: "Save on fuel",
              d: "Average savings per commuter sharing daily",
            },
            {
              stat: "0",
              l: "Surge pricing",
              d: "Drivers set fair prices, never algorithmic spikes",
            },
            {
              stat: "10min",
              l: "Less queue time",
              d: "Skip long transport stations and trotro waits",
            },
          ].map((x) => (
            <div key={x.l}>
              <div className="text-5xl font-bold tracking-tight">{x.stat}</div>
              <div className="mt-2 text-lg font-semibold">{x.l}</div>
              <p className="mt-1 text-sm opacity-80">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h2 className="text-3xl font-bold md:text-4xl">
          Ready to share the road?
        </h2>
        <p className="mt-3 text-muted-foreground">
          Join the community making daily commutes cheaper and friendlier.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" className="h-12 px-6" asChild>
            <Link to="/auth">Create free account</Link>
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-6" asChild>
            <Link to="/routes">Browse routes</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2 font-medium">RideShare</div>
          <div>© {new Date().getFullYear()}</div>
        </div>
      </footer>
    </div>
  );
}
