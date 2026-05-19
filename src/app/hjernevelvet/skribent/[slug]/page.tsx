import type { Metadata } from "next";
import { HjernevelvWriterClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Skribent",
  description: "Skribentprofil",
};

export default function Page() {
  return <HjernevelvWriterClient />;
}
