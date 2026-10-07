"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { API_BASE, SESSION_COOKIE } from "./lib/api";
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import AnimatedLinesBackground from "./components/ui/AnimatedLinesBackground";
import { useCurtainTransition } from "./components/ui/CurtainTransition";

export default function LoginPage() {
  const router = useRouter();
  const { runTransition } = useCurtainTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("expired")) {
      setError("Tu sesión expiró. Inicia sesión para continuar.");
    }
  }, []);

  const handleShowPassword = () => {
    setShowPassword(true);
    if (showTimer.current) clearTimeout(showTimer.current);
    showTimer.current = setTimeout(() => setShowPassword(false), 2500);
  };

  const login = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(
          data.message || data.detail || "Credenciales inválidas",
        );
      }
      const set = (k: string, v: unknown) =>
        v != null &&
        (document.cookie = `${k}=${encodeURIComponent(String(v))}; path=/`);
      set(SESSION_COOKIE, data.session_id);
      set("company_id", data.company_id);
      set("user_name", data.name);
      set("user_email", data.email);
      set("company_name", data.company_name);
      const next = new URLSearchParams(window.location.search).get("next");
      // La cortina cubre la pantalla, navega detrás de ella, y luego se abre
      // revelando el dashboard — por eso NO apagamos `isLoading` aquí: el
      // botón se queda en su estado "Iniciando…" hasta que la cortina se
      // cierra por completo (se ve como parte de la misma transición). Un
      // `finally` de bloque hubiera vuelto a encenderse tras un `return`
      // aquí adentro, así que `setIsLoading(false)` solo vive en el catch.
      runTransition(() => {
        router.push(next && next.startsWith("/") ? next : "/dashboard");
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-base-100 overflow-hidden px-4 py-10">
      {/* Fondo animado + glows de marca */}
      <div className="absolute inset-0 opacity-40">
        <AnimatedLinesBackground />
      </div>
      <div
        className="absolute -top-40 -right-40 w-[600px] h-[600px] pointer-events-none rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklch, var(--color-primary) 12%, transparent) 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute -bottom-52 -left-40 w-[560px] h-[560px] pointer-events-none rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklch, var(--color-primary) 7%, transparent) 0%, transparent 60%)",
        }}
      />

      {/* Tarjeta */}
      <div className="relative z-10 w-full max-w-[440px] animate-slide-in-up">
        <div className="rounded-[28px] border border-base-content/[0.08] bg-base-200/90 backdrop-blur-xl shadow-[0_40px_120px_oklch(0%_0_0_/_45%)] overflow-hidden">
          {/* Barra superior — color de marca (tracks el tema activo) */}
          <div className="h-1 w-full bg-gradient-to-r from-primary via-primary to-primary/20" />

          <div className="p-9 sm:p-11">
            {/* Marca */}
            <div className="flex items-center gap-3 mb-9">
              <div className="relative">
                <Image
                  src="/wispi-logo.png"
                  alt="Wispi"
                  width={44}
                  height={44}
                  className="relative z-10"
                />
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              </div>
              <div className="flex gap-[3px] items-stretch h-9">
                <div className="w-[3px] rounded-sm bg-primary" />
                <div className="w-[3px] rounded-sm bg-primary/50" />
                <div className="w-[3px] rounded-sm bg-primary/20" />
              </div>
              <div className="leading-tight">
                <p className="text-base-content font-black tracking-[0.18em] text-sm">
                  WISPI · XCIEN
                </p>
                <p className="text-primary text-[9px] font-black tracking-[0.32em] uppercase">
                  Portal de Vendedores
                </p>
              </div>
            </div>

            {/* Título */}
            <h1 className="text-3xl font-black text-base-content tracking-tight mb-1.5">
              Iniciar sesión
            </h1>
            <p className="text-base-content/65 text-sm mb-8">
              Ingresa con tu cuenta de Odoo para gestionar tus oportunidades.
            </p>

            <form className="space-y-5" onSubmit={login}>
              <label className="block">
                <span className="text-[11px] font-bold text-base-content/60 uppercase tracking-[0.15em]">
                  Correo
                </span>
                <div className="relative mt-2">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                  <input
                    required
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="tu@correo.com"
                    className="w-full bg-base-content/[0.04] border border-base-content/[0.09] rounded-2xl
                      pl-11 pr-4 py-4 text-sm text-base-content
                      transition-all duration-200
                      focus:outline-none focus:border-primary/60 focus:bg-base-content/[0.06]
                      placeholder:text-base-content/35"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-[11px] font-bold text-base-content/60 uppercase tracking-[0.15em]">
                  Contraseña
                </span>
                <div className="relative mt-2">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="••••••••"
                    className="w-full bg-base-content/[0.04] border border-base-content/[0.09] rounded-2xl
                      pl-11 pr-12 py-4 text-sm text-base-content
                      transition-all duration-200
                      focus:outline-none focus:border-primary/60 focus:bg-base-content/[0.06]
                      placeholder:text-base-content/35"
                  />
                  <button
                    type="button"
                    onClick={handleShowPassword}
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/75 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </label>

              {error && (
                <div className="flex items-start gap-3 bg-error/10 border border-error/20 rounded-2xl px-4 py-3">
                  <div className="w-[3px] self-stretch bg-error rounded-full shrink-0" />
                  <p className="text-error text-[13px] leading-snug">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-brand elevate-glow w-full mt-1 py-4 rounded-2xl transition-all duration-200
                  flex items-center justify-center gap-2
                  text-sm tracking-[0.12em]
                  active:scale-[0.99]
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Iniciando…</span>
                  </>
                ) : (
                  <>
                    <span>Entrar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-base-content/45 text-[11px] mt-7">
              ¿Problemas para acceder? Contacta a tu gerente de zona.
            </p>
          </div>
        </div>

        <p className="text-center text-base-content/40 text-[10px] font-bold uppercase tracking-[0.2em] mt-6">
          Conexión segura · Portal v1.0
        </p>
      </div>
    </div>
  );
}
