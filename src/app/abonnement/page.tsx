import type { Metadata } from "next";
import { SubscribeClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Abonnement",
  description: "Velg abonnement på Nær Næring — tilgang til alt innhold",
};

export default function SubscribePage() {
  return <SubscribeClient />;
}
