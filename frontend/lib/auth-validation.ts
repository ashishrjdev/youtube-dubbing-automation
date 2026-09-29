export const PASSWORD_MIN_LENGTH = 8;
// bcrypt (used by Supabase Auth) only considers the first 72 bytes.
export const PASSWORD_MAX_LENGTH = 72;
const EMAIL_MAX_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export type SignupFields = {
  email: string;
  password: string;
  confirmPassword: string;
};
export type SignupFieldErrors = FieldErrors<SignupFields>;

export type LoginFields = {
  email: string;
  password: string;
};
export type LoginFieldErrors = FieldErrors<LoginFields>;

export function validateEmail(email: string): string | undefined {
  const value = email.trim();
  if (!value) return "Enter your email address.";
  if (value.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(value)) {
    return "Enter a valid email address, like name@example.com.";
  }
}

export function validatePassword(password: string): string | undefined {
  if (!password) return "Enter a password.";
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`;
  }
  if (!/\d/.test(password)) return "Password must include at least one number.";
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string,
): string | undefined {
  if (!confirmPassword) return "Confirm your password.";
  if (password !== confirmPassword) return "Passwords don't match.";
}

function compact<T>(errors: FieldErrors<T>): FieldErrors<T> {
  return Object.fromEntries(
    Object.entries(errors).filter(([, message]) => message),
  ) as FieldErrors<T>;
}

export function validateSignup(fields: SignupFields): SignupFieldErrors {
  return compact<SignupFields>({
    email: validateEmail(fields.email),
    password: validatePassword(fields.password),
    confirmPassword: validateConfirmPassword(fields.password, fields.confirmPassword),
  });
}

/** Login only checks presence: strength rules would hint at which accounts exist. */
export function validateLogin(fields: LoginFields): LoginFieldErrors {
  return compact<LoginFields>({
    email: validateEmail(fields.email),
    password: fields.password ? undefined : "Enter your password.",
  });
}

export type PasswordStrength = {
  /** 0 (empty) to 4 (strong). */
  score: 0 | 1 | 2 | 3 | 4;
  label: "" | "Weak" | "Fair" | "Good" | "Strong";
};

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"] as const;

/** UX hint only; the hard requirements are enforced by validatePassword. */
export function passwordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "" };
  if (validatePassword(password)) return { score: 1, label: "Weak" };

  let score = 2;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (password.length >= 12) score++;
  const capped = Math.min(score, 4) as PasswordStrength["score"];
  return { score: capped, label: STRENGTH_LABELS[capped] };
}

/** Only same-site relative paths, so ?next= can't redirect to another origin. */
export function safeRedirectPath(next: unknown, fallback = "/dashboard"): string {
  if (typeof next !== "string" || !next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
