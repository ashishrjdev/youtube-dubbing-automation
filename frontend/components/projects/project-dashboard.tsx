"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { HowItWorksButton } from "@/components/how-it-works-dialog";
import { ProjectCard, ProjectCardSkeleton } from "@/components/projects/project-card";
import {
  ProjectListEmpty,
  ProjectListError,
} from "@/components/projects/project-dashboard-states";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { useApiFetch } from "@/lib/api";
import { messageForBackendFailure } from "@/lib/backend-errors";
import { projectListView } from "@/lib/project-list-ui";
import type { ProjectListItem, ProjectListResponse } from "@/lib/projects";

const PAGE_SIZE = 20;

type LoadState = "loading" | "ready" | "error";

export function ProjectDashboard() {
  const apiFetch = useApiFetch();
  const [items, setItems] = useState<ProjectListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<LoadState>("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const requestIdRef = useRef(0);

  const fetchPage = useCallback(
    async (offset: number, { append }: { append: boolean }) => {
      const requestId = ++requestIdRef.current;
      if (append) setLoadingMore(true);
      else setState("loading");

      try {
        const response = await apiFetch(
          `/projects?limit=${PAGE_SIZE}&offset=${offset}`,
        );
        if (requestId !== requestIdRef.current) return;

        if (!response.ok) {
          // Never surface raw bodies for 5xx (LEGAL-04).
          messageForBackendFailure(response);
          setState("error");
          setLoadingMore(false);
          return;
        }

        const body = (await response.json()) as ProjectListResponse;
        if (requestId !== requestIdRef.current) return;

        setTotal(body.total);
        setItems((prev) => (append ? [...prev, ...body.items] : body.items));
        setState("ready");
      } catch {
        if (requestId !== requestIdRef.current) return;
        setState("error");
      } finally {
        if (requestId === requestIdRef.current) setLoadingMore(false);
      }
    },
    [apiFetch],
  );

  const reload = useCallback(() => {
    void fetchPage(0, { append: false });
  }, [fetchPage]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Refetch when the tab becomes visible again (PROJ-03).
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [reload]);

  const loadMore = () => {
    if (loadingMore || items.length >= total) return;
    void fetchPage(items.length, { append: true });
  };

  const view = projectListView(state, total);

  return (
    <div className="relative grid gap-8">
      <div
        className="pointer-events-none absolute -left-24 -top-28 size-72 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-20 top-10 size-64 rounded-full bg-brand-indigo/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 animate-[studio-rise_0.45s_ease-out_both]">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary">
            Studio library
          </p>
          <p className="mt-1 max-w-xl text-body-md text-muted-foreground">
            {view === "list"
              ? `${total} project${total === 1 ? "" : "s"} ready to dub, review, or finish.`
              : "Your dubbed projects live here — from first transcript to finished voice track."}
          </p>
        </div>
        <ButtonLink
          href="/projects/new"
          size="lg"
          className="animate-[studio-rise_0.45s_ease-out_both] shadow-button"
        >
          <Plus className="size-4" aria-hidden="true" />
          New Project
        </ButtonLink>
      </div>

      {view === "loading" ? (
        <div
          className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
          aria-busy="true"
          aria-label="Loading projects"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      ) : null}

      {view === "error" ? <ProjectListError onRetry={reload} /> : null}

      {view === "empty" ? (
        <ProjectListEmpty extraAction={<HowItWorksButton />} />
      ) : null}

      {view === "list" ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} />
            ))}
          </div>
          {items.length < total ? (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={loadingMore}
                onClick={loadMore}
                className="min-w-[10rem] rounded-full border-border/80 bg-card/80 backdrop-blur-sm"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
