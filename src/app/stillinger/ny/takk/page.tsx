import type { Metadata } from "next";
import { StillingNyTakkClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stilling registrert",
  description: "Takk for innsendingen",
};

export default function Page() {
  return <StillingNyTakkClient />;
}
