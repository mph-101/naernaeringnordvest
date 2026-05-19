import type { Metadata } from "next";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Min profil",
  description: "Din profil og innstillinger hos Nær Næring",
};

export default function ProfilePage() {
  return <PageClient />;
}
