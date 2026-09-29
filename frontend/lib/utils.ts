import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Custom type scale from globals.css (text-h2, text-label-md, ...). Without
// this, tailwind-merge assumes they're text colors and drops them when a
// color class like text-foreground follows.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "h1",
            "h1-mobile",
            "h2",
            "h3",
            "body-lg",
            "body-md",
            "body-sm",
            "label-md",
            "label-sm",
          ],
        },
      ],
      shadow: [{ shadow: ["card", "card-hover", "button"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
