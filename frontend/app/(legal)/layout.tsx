import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { SHELL_CONTAINER, SHELL_HEADER_HEIGHT } from "@/components/app-shell/shell-container";
import { BrandLogo } from "@/components/brand-logo";
import { LegalFooter } from "@/components/legal-footer";
import { TextLink } from "@/components/text-link";
import { getCurrentUser } from "@/lib/current-user";
import { cn } from "@/lib/utils";

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const back = user
    ? { href: "/dashboard", label: "Back to dashboard" }
    : { href: "/", label: "Back to Home" };

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header
        className={cn(
          SHELL_HEADER_HEIGHT,
          "sticky top-0 z-40 w-full shrink-0 border-b border-border/70 bg-card/85 backdrop-blur-md",
        )}
      >
        <div className={cn(SHELL_CONTAINER, "flex h-full items-center justify-between gap-4")}>
          <Link
            href={user ? "/dashboard" : "/"}
            className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <BrandLogo tagline />
          </Link>
          <TextLink href={back.href} variant="subtle" className="shrink-0 text-label-sm sm:text-body-sm">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {back.label}
          </TextLink>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <LegalFooter />
    </div>
  );
}
