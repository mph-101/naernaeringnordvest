import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hjernevelvet",
  description: "Essay og analyser",
};

export default function Page() {
  // På hyllen (2026-09-19, Magnus) — se App.tsx-tvillingen for samme flagg.
  if (!FEATURES.HJERNEVELV) notFound();
  return <PageClient />;
}
