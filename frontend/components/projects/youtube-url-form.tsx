"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "next/link";

import { FormField, fieldDescribedBy } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiFetch } from "@/lib/api";
import { messageForProjectCreateError, PROJECT_ERROR_MESSAGES } from "@/lib/project-errors";
import type { Project } from "@/lib/projects";
import { cn } from "@/lib/utils";
import { YOUTUBE_INVALID_MESSAGE, isValidYoutubeUrlClient } from "@/lib/youtube-url";

export function YoutubeUrlForm() {
  const apiFetch = useApiFetch();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;

    if (!isValidYoutubeUrlClient(url)) {
      setError(YOUTUBE_INVALID_MESSAGE);
      return;
    }

    setPending(true);
    setError(undefined);
    try {
      const response = await apiFetch("/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_type: "youtube_url", source_ref: url.trim() }),
      });

      if (!response.ok) {
        setError(await messageForProjectCreateError(response));
        return;
      }

      const project = (await response.json()) as Project;
      router.push(`/projects/${project.id}`);
    } catch {
      setError("Something went wrong, please try again");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <FormField
        id="youtubeUrl"
        label="YouTube URL"
        error={error}
        hint="Paste a YouTube video link"
      >
        <Input
          id="youtubeUrl"
          name="youtubeUrl"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://www.youtube.com/watch?v=…"
          value={url}
          disabled={pending}
          aria-invalid={Boolean(error)}
          aria-describedby={fieldDescribedBy("youtubeUrl", { hint: true })}
          onChange={(event) => {
            setUrl(event.target.value);
            if (error) setError(undefined);
          }}
          className={cn(error && "border-destructive")}
        />
      </FormField>

      {error === PROJECT_ERROR_MESSAGES.email_not_verified ? (
        <p className="text-body-sm text-muted-foreground">
          Check your inbox for the link, or{" "}
          <Link href="/verify-email" className="font-medium text-primary underline-offset-4 hover:underline">
            resend verification
          </Link>
          .
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
        {pending ? "Checking video…" : "Start Processing"}
      </Button>
    </form>
  );
}
