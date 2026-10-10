import { AppFooter } from "@/components/app-shell/app-footer";
import { AppHeader } from "@/components/app-shell/app-header";
import { SHELL_CONTAINER } from "@/components/app-shell/shell-container";
import { SidebarContent } from "@/components/app-shell/sidebar-content";
import { VerifyEmailBanner } from "@/components/app-shell/verify-email-banner";
import { HowItWorksProvider } from "@/components/how-it-works-dialog";
import { getCurrentUser } from "@/lib/current-user";
import { cn } from "@/lib/utils";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const email = user?.email ?? null;

  return (
    <HowItWorksProvider autoOpen={Boolean(user && !user.howItWorksSeen)}>
      <div className="flex min-h-full flex-1 bg-background">
        <aside className="sticky top-0 hidden h-svh w-[280px] shrink-0 border-r border-border bg-sidebar lg:block">
          <SidebarContent />
        </aside>
        <div className="flex min-h-svh min-w-0 flex-1 flex-col">
          <AppHeader email={email} />
          {user && !user.emailVerified ? <VerifyEmailBanner email={email} /> : null}
          <main className={cn(SHELL_CONTAINER, "flex-1 py-6 sm:py-8 lg:py-10")}>
            {children}
          </main>
          <AppFooter />
        </div>
      </div>
    </HowItWorksProvider>
  );
}
