"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, XCircle, Clock, RotateCw } from "lucide-react";
import Link from "next/link";
import { apiFetch, getCookie } from "../../lib/api";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifs = async () => {
    const sessionId = getCookie("session_id");
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
        className="btn btn-ghost bg-base-200 border-none rounded-2xl h-14 w-14 p-0 flex items-center justify-center relative active:scale-95 transition-all elevate-1"
      >
        <Bell
          className={`w-5 h-5 ${unreadCount > 0 ? "text-primary" : "text-base-content/40"}`}
        />
        {unreadCount > 0 && (
          <span className="absolute top-3.5 right-3.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-base-200 shadow-sm animate-pulse" />
        )}
      </label>
      <div
        tabIndex={0}
        className="dropdown-content z-[100] mt-4 w-80 card-premium elevate-3 p-6 overflow-hidden backdrop-blur-xl bg-opacity-95"
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
            className={`p-2 rounded-xl bg-base-100 border border-base-content/5 hover:border-primary/20 transition-all ${loading ? "opacity-50" : ""}`}
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-base-100 border border-base-content/5 flex items-center justify-center mx-auto mb-4 opacity-20">
                <Bell className="w-6 h-6" />
              </div>
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
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      n.type === "success"
                        ? "bg-success/10 text-success"
                        : n.type === "error"
                          ? "bg-error/10 text-error"
                          : "bg-primary/10 text-primary"
                    }`}
                  >
                    {n.type === "success" ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : n.type === "error" ? (
                      <XCircle className="w-5 h-5" />
                    ) : (
                      <Bell className="w-5 h-5" />
                    )}
                  </div>
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
