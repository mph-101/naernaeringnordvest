import type { Metadata } from "next";
import { IdrettClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Idrett",
  description: "Idrettsdata og klubboversikt",
};

export default function Page() {
  return <IdrettClient />;
}
