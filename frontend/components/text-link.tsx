import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Links are always blue so they read as clickable; "subtle" is just lighter weight.
const textLinkVariants = cva(
  "inline-flex items-center gap-1 rounded-sm text-primary underline-offset-4 transition-colors outline-none hover:text-primary-container hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        primary: "font-semibold",
        subtle: "font-medium",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

export function TextLink({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof Link> & VariantProps<typeof textLinkVariants>) {
  return <Link className={cn(textLinkVariants({ variant }), className)} {...props} />;
}
