import Link from "next/link";
import { AccountActions } from "./AccountActions";
import { MobileMenu } from "./MobileMenu";
import { navigationItems } from "./navigation";
import { NavigationLink } from "./NavigationLink";

export const MAIN_CONTENT_ID = "main-content";

export function Navbar() {
  return (
    <>
      <a
        href={`#${MAIN_CONTENT_ID}`}
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-sm focus:bg-surface focus:px-4 focus:py-3 focus:text-sm focus:font-medium"
      >
        Pular para o conteúdo
      </a>

      {/* Sem transições de opacity/transform: a Fase 04 anima o header com GSAP. */}
      <header className="fixed inset-x-0 top-0 z-40 bg-background/80 backdrop-blur-md">
        <div className="page-container flex h-16 items-center justify-between md:h-20 lg:grid lg:grid-cols-[1fr_auto_1fr]">
          <Link
            href="/"
            className="justify-self-start font-serif text-2xl leading-none"
          >
            Online Library
          </Link>

          <nav aria-label="Navegação principal" className="hidden lg:block">
            <ul className="flex items-center gap-10">
              {navigationItems.map((item) => (
                <li key={item.label}>
                  <NavigationLink
                    item={item}
                    className="py-2 text-sm font-medium tracking-wide"
                  />
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden justify-self-end lg:block">
            <AccountActions layout="inline" />
          </div>

          <MobileMenu />
        </div>
      </header>
    </>
  );
}
