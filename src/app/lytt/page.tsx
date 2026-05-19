import type { Metadata } from "next";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lytt",
  description: "Lytt til nyheter fra Nær Næring",
};

export default function Page() {
  return <PageClient />;
}
