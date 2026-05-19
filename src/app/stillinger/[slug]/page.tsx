import type { Metadata } from "next";
import { StillingDetailClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stilling",
  description: "Stillingsdetaljer",
};

export default function Page() {
  return <StillingDetailClient />;
}
