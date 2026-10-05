import { CircleAlert } from "lucide-react";
import { useId, type InputHTMLAttributes } from "react";

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  hint?: string;
  error?: string;
}

export function AuthField({ label, name, hint, error, ...inputProps }: AuthFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className="h-12 w-full rounded-md border bg-surface px-4 text-base text-foreground transition-colors placeholder:text-foreground-subtle hover:border-foreground-subtle aria-invalid:border-foreground-muted"
        {...inputProps}
      />
      {hint && (
        <p id={hintId} className="text-sm text-foreground-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-2 text-sm text-foreground">
          <CircleAlert size={16} strokeWidth={1.5} className="mt-1 shrink-0 text-accent" />
          {error}
        </p>
      )}
    </div>
  );
}
