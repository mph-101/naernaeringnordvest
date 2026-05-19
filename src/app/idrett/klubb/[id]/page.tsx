import type { Metadata } from "next";
import { KlubbProfilClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Klubbprofil",
  description: "Detaljer om idrettsklubb",
};

export default function Page() {
  return <KlubbProfilClient />;
}
