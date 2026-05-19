import type { Metadata } from "next";
import { HjernetrimClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hjernetrim",
  description: "Hjernetrim og minispill",
};

export default function Page() {
  return <HjernetrimClient />;
}
