import type { Metadata } from "next";
import { ArrangementerClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Arrangementer",
  description: "Kommende arrangementer i regionen",
};

export default function Page() {
  return <ArrangementerClient />;
}
