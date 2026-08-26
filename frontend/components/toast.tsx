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
          let toneStyle = "bg-[#181b26] border-[var(--line-strong)] text-[var(--fg)] shadow-xl";
          let icon = <IconInfo className="h-4 w-4 text-[var(--muted)] flex-shrink-0" />;

          if (toast.type === "success") {
            toneStyle = "bg-[#0e2118] border-[var(--ok)]/40 text-[var(--ok)] shadow-[0_4px_24px_rgba(154,216,148,0.15)]";
            icon = <IconCheckCircle className="h-4 w-4 text-[var(--ok)] flex-shrink-0" />;
          } else if (toast.type === "error") {
            toneStyle = "bg-[#271112] border-[var(--bad)]/40 text-[var(--bad)] shadow-[0_4px_24px_rgba(255,133,120,0.15)]";
            icon = <IconAlertCircle className="h-4 w-4 text-[var(--bad)] flex-shrink-0" />;
          } else if (toast.type === "tally") {
            toneStyle = "bg-[#25120d] border-[var(--tally)]/50 text-[var(--tally-text)] shadow-[0_4px_24px_rgba(255,77,26,0.2)]";
            icon = <span className="rec-dot !h-2 !w-2 !shadow-none flex-shrink-0" />;
          }

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-xs font-medium backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-3 duration-200 ${toneStyle}`}
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
