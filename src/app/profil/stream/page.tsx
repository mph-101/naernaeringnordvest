import type { Metadata } from "next";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live-stream",
  description: "Administrer dine livestreams",
};

export default function Page() {
  return <PageClient />;
}
