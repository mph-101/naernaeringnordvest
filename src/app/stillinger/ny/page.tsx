import type { Metadata } from "next";
import { StillingNyClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ny stilling",
  description: "Registrer ny stillingsannonse",
};

export default function Page() {
  return <StillingNyClient />;
}
