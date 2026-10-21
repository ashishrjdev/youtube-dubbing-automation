export const PASSWORD_MIN_LENGTH = 8;
// bcrypt (used by Supabase Auth) only considers the first 72 bytes.
export const PASSWORD_MAX_LENGTH = 72;
const EMAIL_MAX_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export const FULL_NAME_MAX_LENGTH = 100;

export type SignupFields = {
  fullName: string;
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

export type ResetPasswordFields = {
  password: string;
  confirmPassword: string;
};
export type ResetPasswordFieldErrors = FieldErrors<ResetPasswordFields>;

export type ChangePasswordFields = {
  currentPassword: string;
  password: string;
  confirmPassword: string;
};
export type ChangePasswordFieldErrors = FieldErrors<ChangePasswordFields>;

export function validateEmail(email: string): string | undefined {
  const value = email.trim();
  if (!value) return "Enter your email address.";
  if (value.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(value)) {
    return "Enter a valid email address, like name@example.com.";
  }
}

export function validateFullName(fullName: string): string | undefined {
  const value = fullName.trim();
  if (!value) return "Enter your full name.";
  if (value.length > FULL_NAME_MAX_LENGTH) {
    return `Full name must be at most ${FULL_NAME_MAX_LENGTH} characters.`;
  }
  if (/[\u0000-\u001f\u007f]/.test(value)) return "Full name contains characters that aren't allowed.";
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
    fullName: validateFullName(fields.fullName),
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

export function validateResetPassword(fields: ResetPasswordFields): ResetPasswordFieldErrors {
  return compact<ResetPasswordFields>({
    password: validatePassword(fields.password),
    confirmPassword: validateConfirmPassword(fields.password, fields.confirmPassword),
  });
}

export function validateChangePassword(fields: ChangePasswordFields): ChangePasswordFieldErrors {
  const passwordError =
    validatePassword(fields.password) ??
    (fields.currentPassword && fields.password === fields.currentPassword
      ? "New password must be different from your current password."
      : undefined);
  return compact<ChangePasswordFields>({
    currentPassword: fields.currentPassword ? undefined : "Enter your current password.",
    password: passwordError,
    confirmPassword: validateConfirmPassword(fields.password, fields.confirmPassword),
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
  // Browsers drop tabs/newlines and treat "\" as "/", so "/\t/evil.com" would
  // become "//evil.com": resolve it the same way and require the origin to stay put.
  const base = "http://same-origin.invalid";
  let url: URL;
  try {
    url = new URL(next, base);
  } catch {
    return fallback;
  }
  if (url.origin !== base) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
