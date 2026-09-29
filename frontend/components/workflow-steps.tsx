import { AudioLines, FileText, Link2, PenLine, type LucideIcon } from "lucide-react";

export const WORKFLOW_STEPS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Link2,
    title: "Add your video",
    description: "Paste a YouTube link or upload the source audio.",
  },
  {
    icon: FileText,
    title: "Transcribe & name speakers",
    description: "We transcribe it and detect who's speaking. You give each speaker a name.",
  },
  {
    icon: PenLine,
    title: "Review the script",
    description: "Polish the AI-rewritten lines so they sound natural and fit the timing.",
  },
  {
    icon: AudioLines,
    title: "Pick voices & generate",
    description: "Choose a voice per speaker and generate the dubbed audio track.",
  },
];
