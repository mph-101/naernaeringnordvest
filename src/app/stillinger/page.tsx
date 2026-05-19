import type { Metadata } from "next";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stillinger",
  description: "Ledige stillinger i regionen",
};

export default function Page() {
  return <PageClient />;
}
