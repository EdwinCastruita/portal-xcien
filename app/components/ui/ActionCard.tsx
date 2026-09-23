"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Props {
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  highlight?: boolean;
  disabled?: boolean;
  href?: string;
}

export default function ActionCard({
  title,
  subtitle,
  Icon,
  highlight,
  disabled,
  href,
}: Props) {
  const content = (
    <div
      className={`relative rounded-3xl p-6 transition-all duration-500 h-40 overflow-hidden group
        ${
          disabled
            ? "bg-base-content/[0.02] border border-dashed border-base-content/10 cursor-not-allowed"
            : highlight
              ? "bg-primary text-primary-content cursor-pointer elevate-2 hover:shadow-[0_20px_48px_-12px_var(--brand-accent-glow)] hover:-translate-y-1"
              : "card-premium card-hover cursor-pointer"
        }`}
    >
      {/* Background Subtle Elements */}
      {!disabled && (
        <div
          className={`absolute top-0 right-0 w-40 h-40 rounded-full translate-x-1/3 -translate-y-1/3 transition-opacity duration-700 blur-[70px] ${
            highlight
              ? "bg-black/20"
              : "bg-primary/5 opacity-0 group-hover:opacity-100"
          }`}
        />
      )}

      {/* Content Container */}
      <div className="relative z-10 h-full flex items-center gap-5">
        {/* Icon Box */}
        <div
          className={`w-12 h-12 flex items-center justify-center rounded-2xl shrink-0 transition-all duration-500 ${!disabled && "group-hover:scale-110"}
            ${
              disabled
                ? "bg-base-content/5 text-base-content/25"
                : highlight
                  ? "bg-primary-content/10 text-primary-content border border-primary-content/20"
                  : "bg-base-100 border border-base-content/5 text-primary shadow-sm"
            }`}
        >
          <Icon className="w-5 h-5" />
        </div>

        {/* Typography */}
        <div className="flex-1 min-w-0">
          <h3
            className={`text-lg font-black tracking-tighter mb-1 truncate transition-colors duration-500
              ${
                disabled
                  ? "text-base-content/30"
                  : highlight
                    ? "text-primary-content"
                    : "text-base-content group-hover:text-primary"
              }`}
          >
            {title}
          </h3>
          <p
            className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-500
              ${
                disabled
                  ? "text-base-content/25"
                  : highlight
                    ? "text-primary-content/70"
                    : "text-base-content/60"
              }`}
          >
            {subtitle}
          </p>
        </div>

        {/* Affordance */}
        {!disabled && (
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500
                ${
                  highlight
                    ? "bg-primary-content text-primary"
                    : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-content"
                }`}
          >
            <ArrowRight className="w-4 h-4" />
          </div>
        )}
        {disabled && (
          <span className="text-[9px] font-black uppercase tracking-widest text-base-content/25 border border-base-content/10 rounded-full px-3 py-1.5 shrink-0">
            Próximamente
          </span>
        )}
      </div>
    </div>
  );

  if (href && !disabled) return <Link href={href}>{content}</Link>;
  return content;
}
