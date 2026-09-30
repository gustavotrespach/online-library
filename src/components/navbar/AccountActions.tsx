import type { NavigationItem } from "./navigation";
import { NavigationLink } from "./NavigationLink";

// Destinos definidos na fase de autenticação, quando esta área também
// passará a exibir o usuário autenticado.
const signInItem: NavigationItem = { label: "Entrar", href: null };
const signUpItem: NavigationItem = { label: "Cadastrar", href: null };

const layoutStyles = {
  inline: {
    container: "flex items-center gap-6",
    signIn: "text-sm font-medium",
    signUp: "rounded-sm border px-4 py-2 text-sm font-medium",
  },
  stacked: {
    container: "flex flex-col gap-3",
    signIn: "flex h-12 items-center justify-center text-base font-medium",
    signUp:
      "flex h-12 items-center justify-center rounded-sm border text-base font-medium",
  },
};

interface AccountActionsProps {
  layout: keyof typeof layoutStyles;
  className?: string;
}

export function AccountActions({ layout, className = "" }: AccountActionsProps) {
  const styles = layoutStyles[layout];

  return (
    <div className={`${styles.container} ${className}`}>
      <NavigationLink item={signInItem} className={styles.signIn} />
      <NavigationLink item={signUpItem} className={styles.signUp} />
    </div>
  );
}
