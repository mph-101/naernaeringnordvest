import type { Metadata } from "next";
import { UnsubscribeClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Avslutt abonnement",
  description: "Administrer nyhetsbrev-innstillinger",
};

export default function Page() {
  return <UnsubscribeClient />;
}
