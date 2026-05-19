import type { Metadata } from "next";
import { PageClient } from "./_loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Logg inn",
  description: "Logg inn eller opprett konto hos Nær Næring",
};

export default function LoginPage() {
  return <PageClient />;
}
