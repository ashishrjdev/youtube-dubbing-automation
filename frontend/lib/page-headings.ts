export type PageHeading = {
  title: string;
  description?: string;
  back?: { href: string; label: string };
};

const BACK_TO_PROJECTS = { href: "/dashboard", label: "Back to projects" };

/** Title shown in the app header for each (app) route. Add new pages here. */
export function pageHeading(pathname: string): PageHeading | null {
  if (pathname === "/dashboard") {
    return {
      title: "Projects",
      description: "Turn any video into a natural-sounding dub, one project at a time.",
    };
  }
  if (pathname === "/projects/new") {
    return {
      title: "New project",
      description: "Choose where your source audio comes from.",
      back: BACK_TO_PROJECTS,
    };
  }
  if (pathname.startsWith("/projects/")) return { title: "Project", back: BACK_TO_PROJECTS };
  if (pathname === "/account") {
    return { title: "Account", description: "Manage your profile, security, and sessions." };
  }
  if (pathname === "/terms") {
    return {
      title: "Terms of Service",
      description: "The rules for using the service, your content, and our responsibilities.",
    };
  }
  if (pathname === "/privacy") {
    return {
      title: "Privacy Policy",
      description: "What data we collect, how we use it, and the choices you have.",
    };
  }
  return null;
}
