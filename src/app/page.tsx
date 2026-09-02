import type { Metadata } from "next";
import { Cockpit } from "@/components/cockpit/Cockpit";

/** Shared setups append query params to this address; the canonical keeps
 *  search engines on the bare cockpit. */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return <Cockpit />;
}
