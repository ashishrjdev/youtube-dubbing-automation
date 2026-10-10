export function initialsFromEmail(email: string | null): string {
  if (!email) return "?";
  const name = email.split("@")[0];
  const parts = name.split(/[._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return letters.toUpperCase();
}

/** First and last initials of the full name; falls back to the email. */
export function initialsFor(fullName: string | null, email: string | null): string {
  const words = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return initialsFromEmail(email);
  // Array.from keeps emoji and other astral characters whole.
  const first = Array.from(words[0])[0];
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : "";
  return (first + last).toUpperCase();
}
