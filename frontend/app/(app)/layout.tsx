import { AppSidebar } from "@/components/app-sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1">
      <AppSidebar />
      <main className="min-w-0 flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
