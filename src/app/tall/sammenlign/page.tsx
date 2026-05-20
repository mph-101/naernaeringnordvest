import type { Metadata } from "next";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sammenlign",
  description: "Sammenlign bedrifter",
};

export default function Page() {
  return <PageClient />;
}
