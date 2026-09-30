export interface NavigationItem {
  label: string;
  // `null` enquanto o destino ainda não existe: o item é exibido sem link.
  href: string | null;
}

export const navigationItems: NavigationItem[] = [
  { label: "Home", href: "/" },
  { label: "My Library", href: null },
  { label: "Reading Progress", href: null },
];
