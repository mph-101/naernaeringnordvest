import type { Metadata } from "next";
import { BusinessPanelClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bedriftspanel",
  description: "Administrer bedriftsabonnement",
};

export default function Page() {
  return <BusinessPanelClient />;
}
