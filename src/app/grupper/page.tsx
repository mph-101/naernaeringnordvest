import type { Metadata } from "next";
import { GroupsClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Grupper",
  description: "Dine grupper på Nær Næring",
};

export default function Page() {
  return <GroupsClient />;
}
