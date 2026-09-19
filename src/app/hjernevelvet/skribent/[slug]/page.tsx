import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Skribent",
  description: "Skribentprofil",
};

export default function Page() {
  if (!FEATURES.HJERNEVELV) notFound();
  return <PageClient />;
}
