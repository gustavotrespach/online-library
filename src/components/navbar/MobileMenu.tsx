"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AccountActions } from "./AccountActions";
import { navigationItems } from "./navigation";
import { NavigationLink } from "./NavigationLink";

const MENU_ID = "mobile-menu";
// Mesmo valor do breakpoint `lg`, a partir do qual a navegação desktop assume.
const DESKTOP_MEDIA_QUERY = "(min-width: 64rem)";

const iconButtonClassName =
  "-mr-3 flex size-12 items-center justify-center rounded-full text-foreground-muted transition-colors hover:text-foreground";

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // showModal() torna o restante da página inerte, prende o foco no menu
  // e fecha com Esc.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Ao passar para o layout desktop, o menu fica oculto por CSS e não pode
  // continuar aberto deixando a página inerte.
  useEffect(() => {
    if (!isOpen) return;

    const desktopQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const closeOnDesktop = () => {
      if (desktopQuery.matches) setIsOpen(false);
    };

    desktopQuery.addEventListener("change", closeOnDesktop);
    return () => desktopQuery.removeEventListener("change", closeOnDesktop);
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <button
        ref={openButtonRef}
        type="button"
        aria-label="Abrir menu"
        aria-expanded={isOpen}
        aria-controls={MENU_ID}
        onClick={() => setIsOpen(true)}
        className={`${iconButtonClassName} lg:hidden`}
      >
        <Menu size={20} strokeWidth={1.5} />
      </button>

      <dialog
        ref={dialogRef}
        id={MENU_ID}
        aria-label="Menu"
        onClose={() => {
          setIsOpen(false);
          openButtonRef.current?.focus();
        }}
        className="fixed inset-0 m-0 size-full max-h-none max-w-none overflow-y-auto overscroll-contain bg-background text-foreground opacity-0 transition-[opacity,display,overlay] transition-discrete duration-300 ease-smooth-in-out open:opacity-100 starting:open:opacity-0 lg:hidden"
      >
        <div className="page-container flex min-h-full flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between md:h-20">
            <span aria-hidden className="font-serif text-2xl leading-none">
              Online Library
            </span>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Fechar menu"
              onClick={closeMenu}
              className={iconButtonClassName}
            >
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>

          <nav
            aria-label="Navegação principal"
            className="flex flex-1 flex-col justify-center py-12"
          >
            <ul className="flex flex-col gap-6">
              {navigationItems.map((item) => (
                <li key={item.label}>
                  <NavigationLink
                    item={item}
                    onClick={closeMenu}
                    className="font-serif text-4xl leading-tight md:text-5xl"
                  />
                </li>
              ))}
            </ul>
          </nav>

          <AccountActions layout="stacked" className="pb-12 md:max-w-sm" />
        </div>
      </dialog>
    </>
  );
}
