"use client";

import { logout } from "@/lib/logout";

export type ApiUploadProgress = {
  loaded: number;
  total: number | null;
  percent: number | null;
};

export type ApiUploadOptions = {
  formData: FormData;
  signal?: AbortSignal;
  onProgress?: (progress: ApiUploadProgress) => void;
};

/**
 * Multipart upload with progress (PROJ-02).
 *
 * Uses XHR against the same-origin `/api/backend` proxy so the access token
 * stays in httpOnly cookies. The proxy attaches the Bearer token and performs
 * the AUTH-06 single refresh + one retry on 401; a terminal 401 here clears
 * the session the same way as `apiFetch`.
 *
 * `fetch` cannot report upload progress, which is why this helper exists.
 */
export function apiUpload(path: string, options: ApiUploadOptions): Promise<Response> {
  const url = `/api/backend/${path.replace(/^\/+/, "")}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;
    xhr.responseType = "text";

    const onAbort = () => {
      xhr.abort();
    };
    if (options.signal) {
      if (options.signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      options.signal.addEventListener("abort", onAbort, { once: true });
    }

    xhr.upload.onprogress = (event) => {
      if (!options.onProgress) return;
      const total = event.lengthComputable ? event.total : null;
      const percent =
        total && total > 0 ? Math.min(100, Math.round((event.loaded / total) * 100)) : null;
      options.onProgress({ loaded: event.loaded, total, percent });
    };

    xhr.onerror = () => {
      options.signal?.removeEventListener("abort", onAbort);
      reject(new TypeError("Network error"));
    };

    xhr.onabort = () => {
      options.signal?.removeEventListener("abort", onAbort);
      reject(new DOMException("Aborted", "AbortError"));
    };

    xhr.onload = () => {
      options.signal?.removeEventListener("abort", onAbort);
      const headers = new Headers();
      const raw = xhr.getAllResponseHeaders();
      for (const line of raw.trim().split(/[\r\n]+/)) {
        const idx = line.indexOf(":");
        if (idx > 0) {
          headers.append(line.slice(0, idx).trim(), line.slice(idx + 1).trim());
        }
      }
      const response = new Response(xhr.responseText, {
        status: xhr.status,
        statusText: xhr.statusText,
        headers,
      });

      if (response.status === 401) {
        logout("local");
      }
      resolve(response);
    };

    xhr.send(options.formData);
  });
}
