import type { NextConfig } from "next";
import { COVER_IMAGE_HOSTS } from "./src/lib/books/cover-hosts";

const nextConfig: NextConfig = {
  // O AGENTS.md deste repositório é mantido manualmente. Sem esta opção, o
  // `next dev` insere nele um bloco gerado quando detecta um agente de IA.
  agentRules: false,
  images: {
    // Somente os hosts de capa das fontes usadas (decisions.md, 011).
    remotePatterns: COVER_IMAGE_HOSTS.map(({ hostname, pathname }) => ({
      protocol: "https",
      hostname,
      pathname: `${pathname}**`,
    })),
  },
};

export default nextConfig;
