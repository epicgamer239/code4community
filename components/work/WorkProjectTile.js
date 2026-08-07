import Link from "next/link";

const tileClass =
  "relative rounded-lg border border-border bg-background px-5 py-8 text-center shadow-sm transition-shadow";

export default function WorkProjectTile({
  id,
  title,
  description,
  available,
  /** When set, the whole tile is a link (e.g. `/work#grade-calculator` or `/grade-calculator`). */
  linkHref = null,
  /** When true (e.g. on `/work`), set `id` for URL hash targets and scroll margin below the top bar. */
  anchorId = false,
}) {
  const dot = available ? "bg-primary" : "bg-muted-foreground/35";
  const titleClass = available ? "text-primary" : "text-foreground";

  const inner = (
    <>
      <span className={`pointer-events-none absolute top-3 right-3 h-2 w-2 rounded-full ${dot}`} aria-hidden />
      <h3 className={`font-semibold text-base mb-2 ${titleClass}`}>{title}</h3>
      <p className="text-sm text-muted-foreground leading-snug">{description}</p>
    </>
  );

  const scrollPad = anchorId ? " scroll-mt-28" : "";

  const interactive = linkHref
    ? `${tileClass} hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2${scrollPad}`
    : `${tileClass} cursor-default${scrollPad}`;

  if (linkHref) {
    return (
      <Link href={linkHref} id={anchorId ? id : undefined} className={interactive}>
        {inner}
      </Link>
    );
  }

  return (
    <div id={anchorId ? id : undefined} className={interactive}>
      {inner}
    </div>
  );
}
