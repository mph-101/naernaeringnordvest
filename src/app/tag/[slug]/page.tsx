import type { Metadata } from "next";
import { TagClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tag",
  description: "Artikler merket med tag",
};

export default function Page() {
  return <TagClient />;
}
