"use client";

import { useEffect } from "react";

const BUST_KEY = "clubby.cache-bust.login-oauth-2026-11-10";

/** Uma vez: limpa SW/cache antigo que ainda servia a tela de login sem OAuth. */
export function PortalCacheBust() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      if (window.localStorage.getItem(BUST_KEY) === "1") {
        return;
      }
      window.localStorage.setItem(BUST_KEY, "1");
    } catch {
      return;
    }

    void (async () => {
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((reg) => reg.unregister()));
        }
      } catch {
        /* ignore */
      }
      window.location.reload();
    })();
  }, []);

  return null;
}
