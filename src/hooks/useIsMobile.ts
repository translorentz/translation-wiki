/**
 * useIsMobile - React hook to detect mobile viewport
 *
 * Returns true when viewport width is below the specified breakpoint.
 * Uses resize listener with cleanup for proper lifecycle management.
 * SSR-safe: returns false during server-side rendering.
 */
"use client";

import { useState, useEffect } from "react";

export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);

    // Check immediately on mount
    checkMobile();

    // Listen for resize events
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint]);

  return isMobile;
}
