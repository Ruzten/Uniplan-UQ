import { clsx } from "clsx";
import { type RefObject, useLayoutEffect, useState } from "react";
import type { HighlightEdge } from "@/src/domain/pensum";

type Props = {
  containerRef: RefObject<HTMLDivElement | null>;
  edges: readonly HighlightEdge[];
};

type DrawnPath = { key: string; d: string; kind: HighlightEdge["kind"] };

const BEND = 48;

function anchor(container: HTMLElement, id: string): DOMRect | null {
  const element = container.querySelector(`[data-subject-id="${id}"]`);
  return element instanceof HTMLElement
    ? element.getBoundingClientRect()
    : null;
}

function pathFor(from: DOMRect, to: DOMRect, origin: DOMRect): string {
  const sx = from.right - origin.left;
  const sy = from.top + from.height / 2 - origin.top;
  const forward = to.left >= from.right;
  const tx = (forward ? to.left : to.right) - origin.left;
  const ty = to.top + to.height / 2 - origin.top;
  const dx = forward ? Math.max(BEND, (tx - sx) / 2) : BEND;
  const c2 = forward ? tx - dx : tx + dx;
  return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${c2} ${ty}, ${tx} ${ty}`;
}

// Decorative: the same relations are written on each card as text.
export function PensumArrows({ containerRef, edges }: Props) {
  const [paths, setPaths] = useState<DrawnPath[]>([]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    function measure(target: HTMLElement) {
      const origin = target.getBoundingClientRect();
      const next: DrawnPath[] = [];
      for (const edge of edges) {
        const from = anchor(target, edge.from);
        const to = anchor(target, edge.to);
        if (from === null || to === null) continue;
        next.push({
          key: `${edge.from}->${edge.to}`,
          d: pathFor(from, to, origin),
          kind: edge.kind,
        });
      }
      setPaths(next);
    }
    measure(container);
    const observer = new ResizeObserver(() => measure(container));
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, edges]);

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full overflow-visible"
    >
      <defs>
        <marker
          id="pensum-arrow-prereq"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" className="fill-warning" />
        </marker>
        <marker
          id="pensum-arrow-dependent"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" className="fill-info" />
        </marker>
      </defs>
      {paths.map((path) => (
        <path
          key={path.key}
          d={path.d}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          markerEnd={`url(#pensum-arrow-${path.kind})`}
          className={clsx(
            "fade-in",
            path.kind === "prereq" ? "stroke-warning" : "stroke-info",
          )}
        />
      ))}
    </svg>
  );
}
