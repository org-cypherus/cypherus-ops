import type { Metadata } from "next";
import { LandingPage } from "@/modules/landing/components/LandingPage";

export const metadata: Metadata = {
  title: "Cypher Ops — Segurança. Controle. Comando.",
  description:
    "Plataforma SaaS com CRM, contratos, financeiro, dashboards e administração. Planos Essencial, Profissional e Enterprise.",
};

export default function HomePage() {
  return <LandingPage />;
}
