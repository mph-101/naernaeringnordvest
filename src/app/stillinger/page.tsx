import type { Metadata } from "next";
import { StillingerClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stillinger",
  description: "Ledige stillinger i regionen",
};

export default function Page() {
  return <StillingerClient />;
}
