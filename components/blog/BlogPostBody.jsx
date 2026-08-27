import Link from "next/link";

function Paragraph({ text }) {
  return <p className="text-muted-foreground leading-relaxed">{text}</p>;
}

function Heading({ text }) {
  return (
    <h2 className="text-2xl font-semibold text-foreground mb-4">{text}</h2>
  );
}

function BulletList({ items }) {
  return (
    <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function TextLink({ label, href }) {
  const isExternal = href.startsWith("http");
  const className = "text-primary hover:underline font-medium";

  if (isExternal) {
    return (
      <p>
        <a href={href} className={className} target="_blank" rel="noopener noreferrer">
          {label} →
        </a>
      </p>
    );
  }

  return (
    <p>
      <Link href={href} className={className}>
        {label} →
      </Link>
    </p>
  );
}

export default function BlogPostBody({ blocks }) {
  return (
    <div className="space-y-8">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "p":
            return <Paragraph key={index} text={block.text} />;
          case "h2":
            return <Heading key={index} text={block.text} />;
          case "ul":
            return <BulletList key={index} items={block.items} />;
          case "link":
            return <TextLink key={index} label={block.label} href={block.href} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
