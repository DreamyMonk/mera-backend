"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "./firebase";

// Sends signed-out visitors to the login page, then back here afterwards.
export function useSignedIn(here: string) {
  const user = useUser();
  const router = useRouter();
  useEffect(() => {
    if (user === null) router.replace(`/login?next=${encodeURIComponent(here)}`);
  }, [user, router, here]);
  return user;
}
