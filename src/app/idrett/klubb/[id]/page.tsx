import type { Metadata } from "next";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Klubbprofil",
  description: "Detaljer om idrettsklubb",
};

export default function Page() {
  return <PageClient />;
}
