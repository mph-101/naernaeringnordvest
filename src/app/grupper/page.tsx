import type { Metadata } from "next";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Grupper",
  description: "Dine grupper på Nær Næring",
};

export default function Page() {
  return <PageClient />;
}
