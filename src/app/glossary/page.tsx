import type { Metadata } from "next";
import { Cockpit } from "@/components/cockpit/Cockpit";

export const metadata: Metadata = {
  title: "Glossary",
  description: "Every term in the app, in plain English.",
};

export default function GlossaryPage() {
  return <Cockpit initial={{ overlay: "glossary" }} />;
}
