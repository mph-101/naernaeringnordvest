import type { Metadata } from "next";
import { OnboardingClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Velkommen",
  description: "Velg din foretrukne startside på Nær Næring",
};

export default function OnboardingPage() {
  return <OnboardingClient />;
}
