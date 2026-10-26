/**
 * Width and side padding shared by the header, banner, page content, and
 * footer, so their left and right edges line up at every breakpoint.
 */
export const SHELL_CONTAINER = "mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10";

/** Header/footer bars: full width at every breakpoint (no max-width cap). */
export const SHELL_FULL_WIDTH = "w-full px-4 sm:px-6 lg:px-10";

/** Header height; the sidebar's logo row uses the same so their borders meet. */
export const SHELL_HEADER_HEIGHT = "h-16 lg:h-[76px]";
