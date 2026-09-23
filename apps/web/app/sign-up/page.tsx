import { Suspense } from "react";

import { AuthForm } from "@/components/auth-form";

export default function SignUp() {
  return (
    <Suspense>
      <AuthForm mode="sign-up" />
    </Suspense>
  );
}
