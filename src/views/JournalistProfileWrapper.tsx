import { useParams } from "react-router-dom";
import JournalistProfile from "./JournalistProfile";

/**
 * Thin Vite-fallback wrapper that reads the :username param from
 * react-router and passes it to the underlying view. Next.js uses its
 * own client.tsx wrapper that reads from next/navigation.
 */
export default function JournalistProfileWrapper() {
  const { username = "" } = useParams<{ username: string }>();
  const cleaned = username.startsWith("@") ? username.slice(1) : username;
  return <JournalistProfile username={cleaned} />;
}
