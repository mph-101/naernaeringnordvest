import type { Metadata } from "next";
import { TeamPageClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Redaksjonen",
  description: "Møt teamet bak Nær Næring Nordvest",
};

export default function TeamPage() {
  return <TeamPageClient />;
}
