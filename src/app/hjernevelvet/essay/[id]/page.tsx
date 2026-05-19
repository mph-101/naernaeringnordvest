import type { Metadata } from "next";
import { HjernevelvEssayClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Essay",
  description: "Hjernevelvet-essay",
};

export default function Page() {
  return <HjernevelvEssayClient />;
}
