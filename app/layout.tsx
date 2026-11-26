import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Space Grotesk va en el repo (variable, subset latin: cubre á, é, ñ, ü…).
// Con `next/font/google`, Google empezó a devolver URLs `/l/font?kit=…&skey=…`
// que Turbopack no resuelve ("next/font/google queries have exactly one
// entry") y el build de Netlify fallaba.
const spaceGrotesk = localFont({
  src: "./fonts/SpaceGrotesk-latin.woff2",
  variable: "--font-display",
  weight: "300 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wispi Portal",
  description: "A portal from wispi",
  icons: {
    icon: "/wispi-logo.png",
    shortcut: "/wispi-logo.png",
    apple: "/wispi-logo.png",
  },
};

import { ThemeProvider } from "./components/ThemeProvider";
import { ToastProvider } from "./components/ToastContext";
import { CurtainProvider } from "./components/ui/CurtainTransition";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-theme="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased `}
      >
        <ThemeProvider>
          <ToastProvider>
            <CurtainProvider>{children}</CurtainProvider>
          </ToastProvider>
        </ThemeProvider>
        {/* Visitas y páginas vistas en Vercel Web Analytics (anónimo). */}
        <Analytics />
      </body>
    </html>
  );
}
