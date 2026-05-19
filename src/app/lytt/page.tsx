import type { Metadata } from "next";
import { LyttClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lytt",
  description: "Lytt til nyheter fra Nær Næring",
};

export default function Page() {
  return <LyttClient />;
}
