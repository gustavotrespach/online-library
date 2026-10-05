import { CircleAlert } from "lucide-react";

// A região existe sempre, vazia ou não, para que leitores de tela anunciem
// cada nova mensagem.
export function FormAlert({ message }: { message: string | null }) {
  return (
    <div role="alert">
      {message && (
        <p className="flex items-start gap-3 rounded-md bg-surface p-4 text-sm text-foreground">
          <CircleAlert size={20} strokeWidth={1.5} className="shrink-0 text-accent" />
          {message}
        </p>
      )}
    </div>
  );
}

interface SubmitButtonProps {
  pending: boolean;
  label: string;
  pendingLabel: string;
}

export function SubmitButton({ pending, label, pendingLabel }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center rounded-sm bg-paper text-base font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
