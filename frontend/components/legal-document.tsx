import { ArrowUp, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { SHELL_CONTAINER } from "@/components/app-shell/shell-container";
import { LegalToc } from "@/components/legal-toc";
import { slugifyHeading, type LegalDocumentData } from "@/lib/legal-content";
import { cn } from "@/lib/utils";

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (typeof node === "object" && "props" in node) {
    return textOf((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

/**
 * Renders a legal markdown file (LEGAL-01/02).
 *
 * Renderer: react-markdown + remark-gfm (tables). Raw HTML in the source is
 * NOT rendered — there is no rehype-raw and no dangerouslySetInnerHTML — so
 * tags like <script> in a file can never execute (SEC-03); they are dropped.
 */
export function LegalDocument({ doc }: { doc: LegalDocumentData }) {
  const showPlaceholderWarning =
    doc.unfilledPlaceholders.length > 0 && process.env.NODE_ENV === "development";

  const title = doc.markdown.match(/^#\s+(.+)$/m)?.[1] ?? "Legal";
  const body = doc.markdown
    .split("\n")
    .filter(
      (line) =>
        !line.startsWith("# ") &&
        !line.startsWith("**Effective date:**") &&
        !line.startsWith("**Version:**"),
    )
    .join("\n");

  return (
    <div id="top" className={cn(SHELL_CONTAINER, "py-8 pb-[35vh] lg:py-12")}>
      {showPlaceholderWarning ? (
        <p
          role="alert"
          className="mb-6 flex items-start gap-2 rounded-lg bg-amber-100 px-4 py-3 text-body-sm font-medium text-amber-900"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          This page still contains unfilled placeholders
        </p>
      ) : null}

      <div className="grid items-start gap-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <LegalToc headings={doc.headings} />
        </div>

        <article className="min-w-0 max-w-[72ch]">
          <h1 className="text-h1 font-semibold text-balance text-foreground">{title}</h1>
          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-y border-border py-4 text-body-sm text-muted-foreground">
            <div className="flex gap-2">
              <dt className="font-semibold text-foreground">Effective date</dt>
              <dd>{doc.effectiveDate}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold text-foreground">Version</dt>
              <dd>{doc.version}</dd>
            </div>
          </dl>

          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-h1 font-semibold text-balance text-foreground">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2
                  id={slugifyHeading(textOf(children))}
                  className="mt-10 scroll-mt-24 text-h3 font-semibold text-foreground"
                >
                  {children}
                </h2>
              ),
              p: ({ children }) => (
                <p className="mt-4 text-body-md leading-relaxed text-foreground">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="mt-4 list-disc space-y-2 pl-6 text-body-md leading-relaxed text-foreground">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="mt-4 list-decimal space-y-2 pl-6 text-body-md leading-relaxed text-foreground">
                  {children}
                </ol>
              ),
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">{children}</strong>
              ),
              a: ({ children, href }) => (
                <a
                  href={href}
                  className="rounded-sm font-medium text-primary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {children}
                </a>
              ),
              table: ({ children }) => (
                <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[36rem] border-collapse text-left text-body-sm">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
              th: ({ children }) => (
                <th className="border-b border-border px-3 py-2 font-semibold text-foreground">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border-b border-border px-3 py-2 align-top text-foreground">
                  {children}
                </td>
              ),
            }}
          >
            {body}
          </ReactMarkdown>

          <a
            href="#top"
            className={cn(
              "mt-10 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2",
              "text-body-sm font-medium text-foreground outline-none hover:bg-muted",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            <ArrowUp className="size-4" aria-hidden="true" />
            Back to top
          </a>
        </article>
      </div>
    </div>
  );
}
