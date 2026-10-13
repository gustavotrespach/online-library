export interface NavigationItem {
  label: string;
  // `null` enquanto o destino ainda não existe: o item é exibido sem link.
  href: string | null;
}

export const navigationItems: NavigationItem[] = [
  { label: "Home", href: "/" },
  // Âncora da seção na Home (LIBRARY_SECTION_ID).
  { label: "My Library", href: "/#my-library" },
  // Âncora da seção na Home (READING_PROGRESS_SECTION_ID).
  { label: "Reading Progress", href: "/#reading-progress" },
];
