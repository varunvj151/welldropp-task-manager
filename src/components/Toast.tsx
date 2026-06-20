import React, { createContext, useContext, useState, ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toast = {
    success: (msg: string) => addToast(msg, "success"),
    error: (msg: string) => addToast(msg, "error"),
    info: (msg: string) => addToast(msg, "info"),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      
      {/* Toast Notification Mount Portal (rendered in bottom right corner) */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => {
            let bgStyle = "";
            let textStyle = "";
            let Icon = Info;

            if (t.type === "success") {
              bgStyle = "bg-emerald-50 border border-emerald-200 shadow-md";
              textStyle = "text-emerald-800";
              Icon = CheckCircle;
            } else if (t.type === "error") {
              bgStyle = "bg-rose-50 border border-rose-200 shadow-md";
              textStyle = "text-rose-800";
              Icon = AlertCircle;
            } else {
              bgStyle = "bg-slate-50 border border-slate-200 shadow-md";
              textStyle = "text-slate-800";
              Icon = Info;
            }

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`flex items-start gap-3 p-4 rounded-xl shadow-lg pointer-events-auto ${bgStyle} ${textStyle}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <Icon className="w-5 h-5 flex-shrink-0" />
                </div>
                <div className="flex-1 text-sm font-medium tracking-tight">
                  {t.message}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  className="flex-shrink-0 p-0.5 rounded-full hover:bg-black/5 transition"
                >
                  <X className="w-4 h-4 cursor-pointer" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider");
  }
  return context;
}
