import type { Metadata } from "next";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mine delte notater",
  description: "Dine delte notater",
};

export default function Page() {
  return <PageClient />;
}
