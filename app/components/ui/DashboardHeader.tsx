"use client";

import { useEffect, useState } from "react";
import { apiFetch, getCookie, SESSION_COOKIE } from "../../lib/api";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

export default function DashboardHeader() {
  const [user, setUser] = useState<{
    name: string;
    email: string;
    company_name: string;
  } | null>(null);

  useEffect(() => {
    const sessionId = getCookie(SESSION_COOKIE);
    if (!sessionId) return;

    apiFetch("/me")
      .then((data) => {
        const u = data?.user;
        if (u) {
          setUser(u);
          if (u.company_name) {
            document.cookie = `company_name=${encodeURIComponent(u.company_name)}; path=/; max-age=86400`;
          }
        }
      })
      .catch(() => null);
  }, []);

  const displayName = user?.name || "Usuario";
  const firstName = displayName.split(" ")[0];

  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 md:mb-10 gap-6 lg:gap-8 animate-fade-in relative">
      {/* Dynamic Background Blur */}
      <div className="absolute -left-20 -top-20 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 space-y-2">
        <p className="text-xs font-bold text-primary tracking-widest uppercase">
          ¡{getGreeting()}, {firstName}!
        </p>
        <h1 className="text-3xl sm:text-4xl xl:text-5xl font-black text-base-content tracking-tighter leading-none">
          PANEL DE CONTROL
        </h1>
        {user?.company_name && (
          <div className="flex items-center gap-3 pt-2">
            <div className="px-3 py-1 rounded-full bg-base-content/5 border border-base-content/10">
              <p className="text-[10px] text-base-content/70 font-black uppercase tracking-widest">
                {user.company_name}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
