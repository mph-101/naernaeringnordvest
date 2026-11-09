import type { Metadata } from "next";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kommer snart",
  description: "Nær Nordvest er en ny næringslivsavis for Møre og Romsdal. Meld deg på for å få beskjed når vi lanserer.",
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return <PageClient />;
}
