"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, XCircle, Clock, RotateCw } from "lucide-react";
import Link from "next/link";
import { apiFetch, getCookie, SESSION_COOKIE } from "../../lib/api";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifs = async () => {
    const sessionId = getCookie(SESSION_COOKIE);
    if (!sessionId) return;

    setLoading(true);
    try {
      const res = await apiFetch("/notifications", { company: true });
      const data = Array.isArray(res?.notifications) ? res.notifications : [];
      setNotifications(data);
      const seenIds = JSON.parse(
        localStorage.getItem("seen_notifications") || "[]",
      );
      const unread = data.filter((n: any) => !seenIds.includes(n.id)).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error("Error fetching notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 120000); // Poll every 2 min
    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = (id: string) => {
    const seenIds = JSON.parse(
      localStorage.getItem("seen_notifications") || "[]",
    );
    if (!seenIds.includes(id)) {
      const newSeen = [...seenIds, id];
      localStorage.setItem("seen_notifications", JSON.stringify(newSeen));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const markAllSeen = () => {
    if (unreadCount === 0) return;
    const ids = notifications.map((n: any) => n.id);
    localStorage.setItem("seen_notifications", JSON.stringify(ids));
    setUnreadCount(0);
  };

  return (
    <div className="dropdown dropdown-end">
      <label
        tabIndex={0}
        onClick={markAllSeen}
        className="btn btn-ghost bg-transparent border-none rounded-full h-11 w-11 md:h-14 md:w-14 p-0 flex items-center justify-center relative active:scale-95 hover:bg-base-content/10 transition-all"
      >
        <Bell
          className={`w-5 h-5 ${unreadCount > 0 ? "text-primary" : "text-base-content/40"}`}
        />
        {unreadCount > 0 && (
          <span className="absolute top-2.5 right-2.5 md:top-3.5 md:right-3.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-base-200 shadow-sm animate-pulse" />
        )}
      </label>
      {/* `!absolute` es obligatorio aquí — ver el mismo comentario en
          DashboardHeader.tsx: `card-premium` define `position:relative`
          fuera de cualquier `@layer`, lo que le gana al `position:absolute`
          de daisyUI (que sí está en una layer) sin importar especificidad. */}
      {/* En xs el panel se fija al viewport con márgenes de 1rem: un `w-80`
          anclado a la derecha de la campana se salía por la izquierda en
          pantallas de 320–375px. Desde sm vuelve a flotar bajo la campana. */}
      <div
        tabIndex={0}
        className="dropdown-content max-sm:!fixed max-sm:inset-x-4 max-sm:top-16 sm:!absolute z-[100] mt-2 sm:mt-4 sm:w-96 card-premium elevate-3 p-4 sm:p-6 overflow-hidden backdrop-blur-xl bg-opacity-95"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/55">
              Notificaciones
            </h3>
            {unreadCount > 0 && (
              <p className="text-primary text-[9px] font-black uppercase mt-1">
                {unreadCount} nuevas actualizaciones
              </p>
            )}
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              fetchNotifs();
            }}
            disabled={loading}
            aria-label="Actualizar notificaciones"
            className={`w-10 h-10 flex items-center justify-center rounded-xl bg-base-100 border border-base-content/5 hover:border-primary/20 transition-all ${loading ? "opacity-50" : ""}`}
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        <div className="space-y-2 max-h-[60dvh] sm:max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="w-8 h-8 text-base-content/25 mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-[10px] font-black text-base-content/45 uppercase tracking-widest leading-relaxed">
                Sin actividad reciente
                <br />
                en tus oportunidades
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const isUnread = !JSON.parse(
                localStorage.getItem("seen_notifications") || "[]",
              ).includes(n.id);
              return (
                <Link
                  key={n.id}
                  href={`/solicitud/${n.solic_id}`}
                  onClick={() => handleNotificationClick(n.id)}
                  className={`flex items-start gap-4 p-4 rounded-2xl border transition-all group relative ${
                    isUnread
                      ? "bg-base-100 border-primary/10"
                      : "bg-transparent border-transparent hover:bg-base-100/50"
                  }`}
                >
                  {n.type === "success" ? (
                    <CheckCircle2 className="w-6 h-6 text-success shrink-0 mt-0.5" />
                  ) : n.type === "error" ? (
                    <XCircle className="w-6 h-6 text-error shrink-0 mt-0.5" />
                  ) : (
                    <Bell className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 overflow-hidden">
                    <p
                      className={`text-[9px] font-black uppercase tracking-widest leading-none mb-1.5 ${
                        n.type === "success"
                          ? "text-success"
                          : n.type === "error"
                            ? "text-error"
                            : "text-primary"
                      }`}
                    >
                      {n.stage}
                    </p>
                    <p className="text-xs font-bold text-base-content truncate group-hover:text-primary transition-colors">
                      {n.opportunity_name}
                    </p>
                    <div className="flex items-center gap-1.5 opacity-40">
                      <Clock className="w-3 h-3" />
                      <span className="text-[9px] font-bold uppercase">
                        {new Date(n.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {isUnread && (
                    <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
