import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

type Props = { href: string; children: ReactNode };

export function ExternalAnchor({ href, children }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 text-accent underline underline-offset-2 hover:opacity-80"
    >
      {children}
      <ExternalLink aria-hidden="true" size={12} />
    </a>
  );
}
