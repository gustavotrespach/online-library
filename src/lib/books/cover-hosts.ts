// Hosts das capas das fontes externas. Usados pelo next.config.ts
// (images.remotePatterns) e pela estante: capas desses hosts passam pela
// otimização do Next.js; URLs informadas manualmente são exibidas como estão.
export const COVER_IMAGE_HOSTS = [
  { hostname: "books.google.com", pathname: "/books/" },
  { hostname: "covers.openlibrary.org", pathname: "/b/" },
] as const;

export function isOptimizableCover(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      COVER_IMAGE_HOSTS.some(
        (host) => parsed.hostname === host.hostname && parsed.pathname.startsWith(host.pathname),
      )
    );
  } catch {
    return false;
  }
}
