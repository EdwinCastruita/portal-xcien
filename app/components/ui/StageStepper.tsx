"use client";

import { Check } from "lucide-react";

type Step = {
  title: string;
  status: "completed" | "current" | "pending" | string;
};

/**
 * Stepper horizontal del flujo de la oportunidad.
 * Recibe `solicitud.timeline` (lo calcula el back a partir del pipeline real).
 */
export default function StageStepper({ steps }: { steps: Step[] }) {
  if (!steps?.length) return null;

  const currentIndex = steps.findIndex((s) => s.status === "current");
  const activeIndex = currentIndex >= 0 ? currentIndex : steps.length - 1;
  const currentStep = steps[currentIndex >= 0 ? currentIndex : -1];

  return (
    <div className="w-full">
      {/* Eyebrow: makes the pipeline legible as a pipeline, not just icons */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <p className="text-[10px] font-black text-base-content/45 uppercase tracking-[0.3em]">
          Pipeline de la oportunidad
        </p>
        <p className="text-[10px] font-black text-primary uppercase tracking-widest shrink-0">
          Etapa {activeIndex + 1} de {steps.length}
        </p>
      </div>

      <div className="w-full overflow-x-auto pb-2">
        <div className="flex items-start min-w-max gap-0 px-1">
          {steps.map((s, i) => {
            const done = s.status === "completed";
            const now = s.status === "current";
            const last = i === steps.length - 1;
            return (
              <div key={i} className="flex items-start">
                <div className="flex flex-col items-center gap-2.5 w-32">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all shrink-0 ${
                      done
                        ? "bg-primary border-primary text-primary-content shadow-[0_0_0_4px_var(--color-primary-glow,transparent)]"
                        : now
                          ? "bg-primary/15 border-primary text-primary ring-4 ring-primary/10"
                          : "bg-base-content/[0.04] border-base-content/15 text-base-content/40"
                    }`}
                  >
                    {done ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span className="text-xs font-black">{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-tight text-center leading-tight ${
                      now
                        ? "text-primary"
                        : done
                          ? "text-base-content/80"
                          : "text-base-content/45"
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
                {!last && (
                  <div
                    className={`h-[3px] w-10 md:w-16 mt-[22px] rounded-full shrink-0 transition-colors ${
                      done ? "bg-primary" : "bg-base-content/10"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Descriptive line: what "current" actually means right now */}
      {currentStep && (
        <p className="mt-4 text-xs font-bold text-base-content/60 leading-snug">
          Estás aquí:{" "}
          <span className="text-base-content">{currentStep.title}</span>. Las
          etapas en gris todavía no comienzan.
        </p>
      )}
    </div>
  );
}
