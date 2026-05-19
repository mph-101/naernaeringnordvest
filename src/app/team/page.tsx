import type { Metadata } from "next";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Redaksjonen",
  description: "Møt teamet bak Nær Næring Nordvest",
};

export default function TeamPage() {
  return <PageClient />;
}
