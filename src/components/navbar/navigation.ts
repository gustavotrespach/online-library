export interface NavigationItem {
  label: string;
  // `null` enquanto o destino ainda não existe: o item é exibido sem link.
  href: string | null;
}

export const navigationItems: NavigationItem[] = [
  { label: "Home", href: "/" },
  // Âncora da seção na Home (LIBRARY_SECTION_ID).
  { label: "My Library", href: "/#my-library" },
  { label: "Reading Progress", href: null },
];
