import type { Metadata } from "next";
import { GroupDetailClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gruppe",
  description: "Gruppedetaljer",
};

export default function Page() {
  return <GroupDetailClient />;
}
