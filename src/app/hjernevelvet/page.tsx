import type { Metadata } from "next";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hjernevelvet",
  description: "Essay og analyser",
};

export default function Page() {
  return <PageClient />;
}
