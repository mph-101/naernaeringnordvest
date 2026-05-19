import type { Metadata } from "next";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Velkommen",
  description: "Velg din foretrukne startside på Nær Næring",
};

export default function OnboardingPage() {
  return <PageClient />;
}
