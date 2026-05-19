import type { Metadata } from "next";
import { ArrangementDetaljClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Arrangement",
  description: "Arrangementdetaljer",
};

export default function Page() {
  return <ArrangementDetaljClient />;
}
