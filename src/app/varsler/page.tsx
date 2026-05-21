import type { Metadata } from "next";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Varsler",
  description: "Endringer i selskaper du følger",
};

export default function Page() {
  return <PageClient />;
}
