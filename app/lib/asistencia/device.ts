// Cámara y GPS del dispositivo. Ambos requieren HTTPS (o localhost).

export type Coords = { latitude: number; longitude: number; accuracy: number };

/** Pide la ubicación. Nunca lanza: devuelve null si no hay permiso o tarda. */
export function getPosition(timeoutMs = 10_000): Promise<Coords | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation)
      return resolve(null);
    let done = false;
    const finish = (value: Coords | null) => {
      if (done) return;
      done = true;
      resolve(value);
    };
    // Respaldo por si el navegador nunca responde (algunos ignoran el timeout)
    const guard = setTimeout(() => finish(null), timeoutMs + 1_500);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(guard);
        finish({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => {
        clearTimeout(guard);
        finish(null);
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}

/** Captura el cuadro actual del video como JPEG (máx. 640 px, calidad 0.7 ≈ 70 KB). */
export function captureFrame(
  video: HTMLVideoElement,
  maxSize = 640,
  quality = 0.7,
): string {
  const { videoWidth: w, videoHeight: h } = video;
  const scale = Math.min(1, maxSize / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen.");
  // Se guarda como la ve el empleado (espejo), igual que la vista previa
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

export function cameraErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Permite el acceso a la cámara en tu navegador para tomar la selfie.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No encontramos una cámara en este dispositivo.";
  }
  if (name === "NotReadableError") {
    return "La cámara está en uso por otra aplicación. Ciérrala e inténtalo de nuevo.";
  }
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "La cámara solo funciona con una conexión segura (HTTPS).";
  }
  return "No se pudo abrir la cámara.";
}
