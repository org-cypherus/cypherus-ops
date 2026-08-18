import type { FeatureKey } from "./types";

export type EnterpriseCapability = {
  feature: FeatureKey;
  title: string;
  summary: string;
  comingSoonDetail: string;
};

/** Capacidades exclusivas do plano Enterprise (UI placeholder na Fase E). */
export const ENTERPRISE_CAPABILITIES: EnterpriseCapability[] = [
  {
    feature: "api",
    title: "API",
    summary: "Integre o Cypher Ops com sistemas internos via API REST autenticada.",
    comingSoonDetail:
      "Em breve: chaves de API, escopos por módulo e documentação OpenAPI para a sua empresa.",
  },
  {
    feature: "webhooks",
    title: "Webhooks",
    summary: "Receba eventos de leads, contratos e pagamentos no seu endpoint.",
    comingSoonDetail:
      "Em breve: cadastro de endpoints, assinatura HMAC e reenvio de eventos falhos.",
  },
  {
    feature: "customizations",
    title: "Personalizações",
    summary: "Campos, fluxos e branding sob medida para a operação da empresa.",
    comingSoonDetail:
      "Em breve: campos customizados, automações e branding white-label no app.",
  },
];
