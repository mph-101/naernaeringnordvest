import type { Metadata } from "next";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Velkommen som abonnent",
};

export default function SubscribeReturnPage() {
  return <PageClient />;
}
