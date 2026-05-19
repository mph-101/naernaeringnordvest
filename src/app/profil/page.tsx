import type { Metadata } from "next";
import { ProfileClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Min profil",
  description: "Din profil og innstillinger hos Nær Næring",
};

export default function ProfilePage() {
  return <ProfileClient />;
}
