import type { Metadata } from "next";
import { LoginClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Logg inn",
  description: "Logg inn eller opprett konto hos Nær Næring",
};

export default function LoginPage() {
  return <LoginClient />;
}
