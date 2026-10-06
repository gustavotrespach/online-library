"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import type { NavigationItem } from "./navigation";

interface NavigationLinkProps {
  item: NavigationItem;
  className?: string;
  onClick?: () => void;
}

export function NavigationLink({
  item,
  className = "",
  onClick,
}: NavigationLinkProps) {
  if (item.href === null) {
    // Um <a> sem href é um placeholder: não recebe foco nem clique.
    return (
      <a className={`${className} text-foreground-subtle`}>
        {item.label}
        <span className="sr-only"> (em breve)</span>
      </a>
    );
  }

  const href = item.href;

  return (
    <Link
      href={href}
      onClick={(event) => {
        onClick?.();
        scrollToSection(event, href);
      }}
      className={`${className} text-foreground-muted transition-colors hover:text-foreground`}
    >
      {item.label}
    </Link>
  );
}

// Rolagem suave pontual até uma seção da Home, sem scroll-behavior global
// (que interfere no ScrollTrigger do Hero). Fora da Home, o Link navega
// normalmente até a âncora.
function scrollToSection(event: MouseEvent<HTMLAnchorElement>, href: string) {
  if (!href.startsWith("/#") || window.location.pathname !== "/") return;
  const target = document.getElementById(href.slice(2));
  if (!target) return;

  event.preventDefault();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  window.history.pushState(null, "", href);
}
