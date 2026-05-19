import type { Metadata } from "next";
import { SubscribeReturnClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Velkommen som abonnent",
};

export default function SubscribeReturnPage() {
  return <SubscribeReturnClient />;
}
