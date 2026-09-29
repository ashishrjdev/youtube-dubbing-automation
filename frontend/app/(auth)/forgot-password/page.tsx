import type { Metadata } from "next";

import { ForgotPasswordFlow } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordFlow />;
}
