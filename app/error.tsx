"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-[60vh] flex items-center justify-center p-6">
      <section className="w-full max-w-lg px-4 text-center space-y-5">
        <h1 className="text-2xl font-black uppercase">Ocurrió un error</h1>
        <p className="text-sm text-base-content/60">La pantalla tuvo un problema. Puedes volver a intentarlo o iniciar sesión de nuevo.</p>
        <div className="flex justify-center gap-3">
          <button onClick={reset} className="btn btn-primary">Reintentar</button>
          <a href="/" className="btn btn-ghost">Ir al inicio de sesión</a>
        </div>
      </section>
    </main>
  );
}
