import type { Metadata } from "next";
import { SammenligneClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sammenlign klubber",
  description: "Sammenlign idrettsklubber",
};

export default function Page() {
  return <SammenligneClient />;
}
