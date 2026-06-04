import type { Metadata } from "next";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Næringspulsen",
  description: "Det datadrevne næringsbarometeret for Nordvestlandet — åpne nøkkeltall fra SSB.",
};

export default function Page() {
  return <PageClient />;
}
