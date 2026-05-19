import type { Metadata } from "next";
import { HjernevelvetClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hjernevelvet",
  description: "Essay og analyser",
};

export default function Page() {
  return <HjernevelvetClient />;
}
