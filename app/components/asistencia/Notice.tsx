"use client";

import { AlertTriangle, CircleCheck, Info, MapPinOff, X } from "lucide-react";
import { useEffect } from "react";

export type NoticeData = {
  type: "success" | "warning" | "danger" | "info";
  title: string;
  message?: string;
  /** Los avisos de geocerca (fuera / sin GPS) se quedan hasta que se cierran. */
  sticky?: boolean;
};

const STYLES = {
  success: {
    Icon: CircleCheck,
    tone: "text-success",
    ring: "border-success/30 bg-success/10",
  },
  warning: {
    Icon: MapPinOff,
    tone: "text-warning",
    ring: "border-warning/30 bg-warning/10",
  },
  danger: {
    Icon: AlertTriangle,
    tone: "text-error",
    ring: "border-error/30 bg-error/10",
  },
  info: {
    Icon: Info,
    tone: "text-primary",
    ring: "border-primary/30 bg-primary/10",
  },
};

export function Notice({
  notice,
  onClose,
}: {
  notice: NoticeData;
  onClose: () => void;
}) {
  useEffect(() => {
    if (notice.sticky) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [notice, onClose]);

  const { Icon, tone, ring } = STYLES[notice.type];
  return (
    <div
      role={notice.type === "danger" ? "alert" : "status"}
      className={`flex animate-slide-in-up gap-3 rounded-2xl border px-4 py-3.5 ${ring}`}
    >
      <Icon className={`mt-0.5 size-5 shrink-0 ${tone}`} />
      <div className="min-w-0 flex-1">
        <p className={`font-bold text-[14px] ${tone}`}>{notice.title}</p>
        {notice.message && (
          <p className="mt-0.5 text-[13px] text-base-content/75 leading-snug">
            {notice.message}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar aviso"
        className="-m-1 self-start p-1 text-base-content/50 hover:text-base-content"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
