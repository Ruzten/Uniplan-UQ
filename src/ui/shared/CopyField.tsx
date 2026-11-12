import { Check, Copy } from "lucide-react";
import { useId, useState } from "react";

type Props = {
  label: string;
  value: string;
  multiline?: boolean;
  buttonLabel?: string;
};

export function CopyField({
  label,
  value,
  multiline = false,
  buttonLabel = "Copiar",
}: Props) {
  const id = useId();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      const field = document.getElementById(id);
      if (
        field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement
      ) {
        field.select();
      }
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label}
      </label>
      <div className="flex items-start gap-2">
        {multiline ? (
          <textarea
            id={id}
            readOnly
            rows={4}
            value={value}
            className="field font-mono text-sm"
          />
        ) : (
          <input
            id={id}
            type="text"
            readOnly
            value={value}
            className="field font-mono text-sm"
          />
        )}
        <button
          type="button"
          onClick={() => void copy()}
          className="btn shrink-0"
        >
          {copied ? (
            <Check aria-hidden="true" size={16} className="text-success" />
          ) : (
            <Copy aria-hidden="true" size={16} />
          )}
          {copied ? "Copiado" : buttonLabel}
        </button>
      </div>
    </div>
  );
}
