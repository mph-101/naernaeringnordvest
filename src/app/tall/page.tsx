import type { Metadata } from "next";
import { TallClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tall",
  description: "Bedriftsdata og nøkkeltall",
};

export default function Page() {
  return <TallClient />;
}
