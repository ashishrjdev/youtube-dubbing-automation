import { MobileNav } from "@/components/app-shell/mobile-nav";
import { SidebarContent } from "@/components/app-shell/sidebar-content";
import { HowItWorksProvider } from "@/components/how-it-works-dialog";
import { getCurrentUserEmail, hasSeenHowItWorks } from "@/lib/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [email, seenHowItWorks] = await Promise.all([getCurrentUserEmail(), hasSeenHowItWorks()]);

  return (
    <HowItWorksProvider autoOpen={!seenHowItWorks}>
      <div className="flex min-h-full flex-1 flex-col bg-background lg:flex-row">
        <aside className="sticky top-0 hidden h-svh w-[280px] shrink-0 border-r border-border bg-sidebar lg:block">
          <SidebarContent email={email} />
        </aside>
        <MobileNav email={email} />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
            {children}
          </div>
        </main>
      </div>
    </HowItWorksProvider>
  );
}
