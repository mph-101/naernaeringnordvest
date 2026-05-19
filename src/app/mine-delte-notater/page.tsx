import type { Metadata } from "next";
import { MineDelteNotaterClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mine delte notater",
  description: "Dine delte notater",
};

export default function Page() {
  return <MineDelteNotaterClient />;
}
