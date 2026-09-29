"use client";

import { Dialog } from "@base-ui/react/dialog";
import { CircleHelp, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { HowItWorks } from "@/components/how-it-works";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/brand";
import { markHowItWorksSeen } from "@/lib/onboarding-actions";

const OpenHowItWorksContext = createContext<(() => void) | null>(null);

export function useOpenHowItWorks(): () => void {
  const open = useContext(OpenHowItWorksContext);
  if (!open) throw new Error("useOpenHowItWorks must be used inside HowItWorksProvider");
  return open;
}

/** Renders the single "How it works" modal; opens it automatically when `autoOpen`. */
export function HowItWorksProvider({
  autoOpen,
  children,
}: {
  autoOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(autoOpen);
  const openDialog = useCallback(() => setOpen(true), []);

  useEffect(() => {
    if (autoOpen) void markHowItWorksSeen();
  }, [autoOpen]);

  return (
    <OpenHowItWorksContext.Provider value={openDialog}>
      {children}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border/70 bg-card p-5 shadow-2xl outline-none transition-[opacity,scale] duration-200 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="grid gap-1">
                <Dialog.Title className="text-h3 text-foreground">How {APP_NAME} works</Dialog.Title>
                <Dialog.Description className="text-body-md text-muted-foreground">
                  Four steps from source video to finished dub.
                </Dialog.Description>
              </div>
              <Dialog.Close
                aria-label="Close"
                className="-mt-1 -mr-1 flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-surface-container-low hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-5" aria-hidden="true" />
              </Dialog.Close>
            </div>
            <HowItWorks onFinish={() => setOpen(false)} />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </OpenHowItWorksContext.Provider>
  );
}

/** Secondary button that reopens the modal. */
export function HowItWorksButton({ className }: { className?: string }) {
  const open = useOpenHowItWorks();
  return (
    <Button variant="outline" size="lg" onClick={open} className={className}>
      <CircleHelp className="size-4" aria-hidden="true" />
      How it works
    </Button>
  );
}
