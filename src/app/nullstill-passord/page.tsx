import type { Metadata } from "next";
import { ResetPasswordClient } from "./client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nullstill passord",
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
