import type { Metadata } from "next";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kommer snart",
  description: "Vi jobber med noe nytt. Følg med — mer informasjon kommer snart.",
};

export default function ComingSoonPage() {
  return <PageClient />;
}
