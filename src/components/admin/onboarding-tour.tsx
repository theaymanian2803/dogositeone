import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TOUR_STEPS, isOnboarded, markOnboarded } from "@/lib/onboarding";

export function OnboardingTour() {
  const navigate = useNavigate();
  const [index, setIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isOnboarded()) setIndex(0);
  }, []);

  const step = index === null ? null : TOUR_STEPS[index];

  const measure = useCallback(() => {
    if (!step?.target) {
      setRect(null);
      return;
    }
    const element = document.querySelector(step.target);
    setRect(element ? element.getBoundingClientRect() : null);
  }, [step]);

  useEffect(() => {
    if (!step) return;
    if (step.href) void navigate({ to: step.href });
    const timer = setTimeout(measure, step.href ? 750 : 120);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step, measure, navigate]);

  useEffect(() => {
    if (index === null) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        markOnboarded();
        setIndex(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index]);

  if (index === null || !step) return null;

  function finish() {
    markOnboarded();
    setIndex(null);
  }

  function next() {
    if (index === null) return;
    if (index >= TOUR_STEPS.length - 1) {
      finish();
      return;
    }
    setIndex(index + 1);
  }

  const isLast = index === TOUR_STEPS.length - 1;

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[60] bg-foreground/25"
      />
      {rect && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[65] border-2 border-hot-pink transition-all duration-300"
          style={{
            left: Math.max(8, rect.left - 6),
            top: Math.max(8, rect.top - 6),
            width: Math.min(window.innerWidth - 16, rect.width + 12),
            height: rect.height + 12,
          }}
        />
      )}

      <div className="fixed inset-x-0 bottom-5 z-[70] flex justify-center px-4">
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="onboarding-title"
          className="w-full max-w-md border border-foreground bg-background p-5 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-hot-pink">
              Tour · {index + 1} / {TOUR_STEPS.length}
            </p>
            <button
              type="button"
              onClick={finish}
              aria-label="Skip the tour"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <h2 id="onboarding-title" className="font-display mt-2 text-2xl font-bold leading-none">
            {step.title}
          </h2>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{step.body}</p>

          <div className="mt-5 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={finish}
              className="rounded-none text-[10px] uppercase tracking-[0.08em] text-muted-foreground"
            >
              Skip tour
            </Button>
            <div className="flex items-center gap-2">
              {index > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIndex((index ?? 0) - 1)}
                  className="rounded-none text-[10px] uppercase tracking-[0.08em]"
                >
                  <ArrowLeft className="size-3.5" /> Back
                </Button>
              )}
              <Button
                type="button"
                onClick={next}
                className="rounded-none bg-foreground text-[10px] font-bold uppercase tracking-[0.08em] text-background hover:bg-hot-pink hover:text-foreground"
              >
                {isLast ? "Finish" : "Next"} <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
