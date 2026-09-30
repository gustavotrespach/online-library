import Link from "next/link";
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

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`${className} text-foreground-muted transition-colors hover:text-foreground`}
    >
      {item.label}
    </Link>
  );
}
