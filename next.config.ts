import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O AGENTS.md deste repositório é mantido manualmente. Sem esta opção, o
  // `next dev` insere nele um bloco gerado quando detecta um agente de IA.
  agentRules: false,
};

export default nextConfig;
