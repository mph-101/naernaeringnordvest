import type { Metadata } from "next";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tall",
  description: "Bedriftsdata og nøkkeltall",
};

export default function Page() {
  return <PageClient />;
}
