"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Navigates to `href` after `delayMs`; render a visible link alongside it. */
export function RedirectAfter({ href, delayMs }: { href: string; delayMs: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setTimeout(() => router.replace(href), delayMs);
    return () => clearTimeout(id);
  }, [href, delayMs, router]);

  return null;
}
