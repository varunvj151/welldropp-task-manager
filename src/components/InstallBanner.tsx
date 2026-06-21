import React, { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed or previously dismissed this session
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      sessionStorage.getItem("install-banner-dismissed")
    ) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Small delay so the page settles before showing the banner
      setTimeout(() => setVisible(true), 1500);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
      setDismissed(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    sessionStorage.setItem("install-banner-dismissed", "1");
  };

  if (dismissed || !deferredPrompt) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm"
        >
          <div className="flex items-center gap-3 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-2xl px-4 py-3 border border-slate-700/60">
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md">
              <Download className="w-5 h-5 text-white" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-tight">Install WellDropp</p>
              <p className="text-xs text-slate-400 leading-tight mt-0.5">
                Install as an app for better performance and offline access.
              </p>
            </div>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Install button */}
            <button
              onClick={handleInstall}
              className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              Install
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
