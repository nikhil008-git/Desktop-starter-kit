import { Suspense } from "react";

import { AuthForm } from "@/components/auth-form";

// `useSearchParams` needs a Suspense boundary or `next build` refuses the page.
export default function SignIn() {
  return (
    <Suspense>
      <AuthForm mode="sign-in" />
    </Suspense>
  );
}
