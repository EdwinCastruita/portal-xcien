"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body>
        <main className="min-h-dvh flex items-center justify-center p-4 sm:p-6 font-sans">
          <section className="max-w-lg text-center space-y-5">
            <h1 className="text-2xl font-black">No se pudo cargar el portal</h1>
            <p>Intenta recargar la pantalla o vuelve a iniciar sesión.</p>
            <div className="flex justify-center gap-3">
              <button onClick={reset}>Reintentar</button>
              <a href="/">Iniciar sesión</a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
