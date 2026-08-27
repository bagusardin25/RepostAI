"use client";

import { createContext, useContext, useState, useCallback, useTransition } from "react";
import { IconCheckCircle, IconAlertCircle, IconInfo, IconXMark } from "@frontend/components/icons";

export type ToastType = "success" | "error" | "info" | "tally";

export interface ToastItem {
  id: string;
  message: string;
  type?: ToastType;
  durationMs?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [, startTransition] = useTransition();

  const removeToast = useCallback((id: string) => {
    startTransition(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    });
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", durationMs = 2800) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const toast: ToastItem = { id, message, type, durationMs };

      startTransition(() => {
        setToasts((prev) => [...prev.slice(-3), toast]);
      });

      if (durationMs > 0) {
        setTimeout(() => {
          removeToast(id);
        }, durationMs);
      }
    },
    [removeToast]
  );

  const success = useCallback((msg: string) => showToast(msg, "success"), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, "error", 4000), [showToast]);
  const info = useCallback((msg: string) => showToast(msg, "info"), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      <aside
        aria-live="polite"
        aria-label="Notifications"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          let toneStyle = "toast";
          let icon = <IconInfo className="h-4 w-4 text-[var(--fg-muted)] flex-shrink-0" />;

          if (toast.type === "success") {
            toneStyle = "toast toast-ok";
            icon = <IconCheckCircle className="h-4 w-4 text-[var(--ok)] flex-shrink-0" />;
          } else if (toast.type === "error") {
            toneStyle = "toast toast-bad";
            icon = <IconAlertCircle className="h-4 w-4 text-[var(--bad)] flex-shrink-0" />;
          } else if (toast.type === "tally") {
            toneStyle = "toast toast-tally";
            icon = <span className="rec-dot !h-2 !w-2 flex-shrink-0" />;
          }

          return (
            <div
              key={toast.id}
              role="status"
              className={toneStyle}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {icon}
                <span className="truncate">{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="opacity-70 hover:opacity-100 p-0.5 transition-opacity"
                aria-label="Dismiss notification"
              >
                <IconXMark className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </aside>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
