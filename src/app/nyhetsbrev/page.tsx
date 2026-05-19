import type { Metadata } from "next";
import { NewsletterClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nyhetsbrev",
  description: "Meld deg på nyhetsbrevet fra Nær Næring",
};

export default function Page() {
  return <NewsletterClient />;
}
