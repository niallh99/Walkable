import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share } from "lucide-react";

// The browser's native install event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "walkable-install-dismissed";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed recently
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      // Re-show after 30 days
      if (Date.now() - dismissedAt < 30 * 24 * 60 * 60 * 1000) return;
    }

    // Already running as installed PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

    if (ios && isSafari) {
      setIsIOS(true);
      // Delay to avoid appearing on first page load instantly
      setTimeout(() => setIsVisible(true), 3000);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setIsVisible(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  };

  if (!isVisible || isInstalled) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Cyan accent bar */}
        <div className="h-1 bg-walkable-cyan" />

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* App icon */}
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-walkable-cyan flex items-center justify-center">
              <Download className="h-6 w-6 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">
                Add Walkable to your home screen
              </p>
              {isIOS ? (
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Tap{" "}
                  <span className="inline-flex items-center gap-0.5 font-medium text-gray-700">
                    <Share className="h-3 w-3" /> Share
                  </span>{" "}
                  then{" "}
                  <span className="font-medium text-gray-700">
                    "Add to Home Screen"
                  </span>{" "}
                  for the full app experience.
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-0.5">
                  Install for offline access and a faster, app-like experience.
                </p>
              )}
            </div>

            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 -mt-0.5 -mr-0.5 p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Action buttons — only shown on Android/desktop (iOS uses native share sheet) */}
          {!isIOS && (
            <div className="flex gap-2 mt-3">
              <Button
                onClick={handleInstall}
                className="flex-1 bg-walkable-cyan hover:bg-walkable-cyan text-white text-sm h-9"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Install App
              </Button>
              <Button
                variant="outline"
                onClick={handleDismiss}
                className="text-sm h-9 px-4"
              >
                Not now
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
