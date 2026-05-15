import React from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import communityImg from "@/assets/community.png";
import savingsImg from "@/assets/savings.png";
import trustImg from "@/assets/trust.png";
import efficiencyImg from "@/assets/efficiency.png";

const slides = [
  {
    image: communityImg,
    title: "Vibrant Community",
    description:
      "Share your daily commute with trusted neighbors and colleagues.",
  },
  {
    image: savingsImg,
    title: "Cut Your Costs",
    description:
      "Save up to 40% on fuel and transportation expenses every day.",
  },
  {
    image: trustImg,
    title: "Verified Safety",
    description:
      "Every commuter is verified through phone and work credentials.",
  },
  {
    image: efficiencyImg,
    title: "Smart Travel",
    description:
      "Get to your destination faster by skipping the long transport queues.",
  },
];

export function HeroSlider() {
  const [emblaRef] = useEmblaCarousel({ loop: true, duration: 40 }, [
    Autoplay({ delay: 5000, stopOnInteraction: false }),
  ]);

  return (
    <div className="relative w-full group overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/5 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] transition-all duration-700 hover:shadow-primary/20 animate-float">
      <div className="embla h-full" ref={emblaRef}>
        <div className="embla__container flex h-full">
          {slides.map((slide, i) => (
            <div
              key={i}
              className="embla__slide relative min-w-0 flex-[0_0_100%] overflow-hidden"
            >
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="h-full w-full object-cover transition-transform duration-[10s] ease-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80" />
                <div className="absolute bottom-0 left-0 w-full p-8 md:p-10 transform transition-transform duration-500 translate-y-2 group-hover:translate-y-0">
                  <h3 className="text-2xl font-bold text-white md:text-3xl tracking-tight">
                    {slide.title}
                  </h3>
                  <p className="mt-3 text-sm text-gray-300 md:text-lg leading-relaxed font-medium">
                    {slide.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Decorative accent: subtle edge glow */}
      <div className="absolute inset-0 rounded-[2.5rem] border-[1.5px] border-white/10 pointer-events-none group-hover:border-primary/30 transition-colors duration-500" />
    </div>
  );
}
