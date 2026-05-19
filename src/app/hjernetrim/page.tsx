import type { Metadata } from "next";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hjernetrim",
  description: "Hjernetrim og minispill",
};

export default function Page() {
  return <PageClient />;
}
