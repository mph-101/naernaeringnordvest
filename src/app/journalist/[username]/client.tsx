"use client";

import { useParams } from "next/navigation";
import View from "@/views/JournalistProfile";

export function JournalistProfileClient() {
  const params = useParams() as { username?: string };
  const raw = decodeURIComponent(params.username || "");
  // Strip a leading '@' that may come through the rewrite
  const username = raw.startsWith("@") ? raw.slice(1) : raw;
  return <View username={username} />;
}
