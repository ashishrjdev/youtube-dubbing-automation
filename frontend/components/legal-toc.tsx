"use client";

import { useEffect, useState } from "react";

import type { LegalHeading } from "@/lib/legal-content";
import { cn } from "@/lib/utils";

/**
 * Table of contents with scrollspy: the link for the section currently in
 * view is highlighted (and marked aria-current), as is a clicked link.
 */
export function LegalToc({ headings }: { headings: LegalHeading[] }) {
  const [activeId, setActiveId] = useState<string | null>(
    () => headings[0]?.id ?? null,
  );

  useEffect(() => {
    const updateFromHash = () => {
      const id = window.location.hash.slice(1);
      if (headings.some((heading) => heading.id === id)) setActiveId(id);
    };
    updateFromHash();
    window.addEventListener("hashchange", updateFromHash);
    return () => window.removeEventListener("hashchange", updateFromHash);
  }, [headings]);

  useEffect(() => {
    const sections = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    // Highlight the last section whose heading has scrolled past the offset.
    const onScroll = () => {
      const offset = 120;
      let current = sections[0];
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= offset) current = section;
      }
      setActiveId(current.id);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [headings]);

  return (
    <nav aria-label="Table of contents">
      <h2 className="text-label-md font-semibold tracking-wide text-foreground uppercase">
        Contents
      </h2>
      <ol className="mt-3 grid gap-1">
        {headings.map((heading) => {
          const active = heading.id === activeId;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                onClick={() => setActiveId(heading.id)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "block rounded-md px-2 py-1.5 text-body-sm outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  active
                    ? "bg-primary-fixed font-semibold text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
