"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, [removeToast]);

  const success = (msg: string) => toast(msg, "success");
  const error = (msg: string) => toast(msg, "error");
  const info = (msg: string) => toast(msg, "info");

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      <div className="fixed bottom-8 right-8 z-[1000] flex flex-col gap-3 max-w-md w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              flex items-center gap-4 p-4 rounded-2xl elevate-3 border backdrop-blur-xl animate-slide-in-right transition-all
              ${t.type === "success" ? "bg-success/10 border-success/20 text-success" : ""}
              ${t.type === "error" ? "bg-error/10 border-error/20 text-error" : ""}
              ${t.type === "info" ? "bg-primary/10 border-primary/20 text-primary" : ""}
              ${t.type === "warning" ? "bg-warning/10 border-warning/20 text-warning" : ""}
            `}
          >
            <div className="shrink-0">
              {t.type === "success" && <CheckCircle className="w-5 h-5" />}
              {t.type === "error" && <AlertCircle className="w-5 h-5" />}
              {t.type === "info" && <Info className="w-5 h-5" />}
              {t.type === "warning" && <AlertCircle className="w-5 h-5" />}
            </div>
            <div className="flex-1 font-black text-[11px] uppercase tracking-widest leading-relaxed">
              {t.message}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-1 hover:bg-base-content/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
