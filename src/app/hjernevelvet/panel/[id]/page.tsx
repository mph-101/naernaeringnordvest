import type { Metadata } from "next";
import { HjernevelvPanelClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panel",
  description: "Hjernevelvet-panel",
};

export default function Page() {
  return <HjernevelvPanelClient />;
}
