"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Static export has no server redirect, so `/` forwards on the client.
export default function Index() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/individual/home");
  }, [router]);
  return null;
}
