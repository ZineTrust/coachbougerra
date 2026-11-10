import { cn } from "@/lib/utils";

/*
  The assistant writes plain text with a little Markdown: **bold**, lists with "-" or "1." and sometimes
  a heading. This turns that into real elements (never raw HTML, so nothing the model writes can inject
  markup) and keeps every paragraph's direction automatic, so Arabic and French both read correctly.
*/

type Block = { kind: "p"; text: string } | { kind: "ul" | "ol"; items: string[] };

const BULLET = /^[-*•–]\s+(.*)$/;
const NUMBERED = /^\d+[.)]\s+(.*)$/;
const HEADING = /^#{1,6}\s+(.*)$/;

function parse(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { kind: "ul" | "ol"; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length > 0) blocks.push({ kind: "p", text: paragraph.join("\n") });
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };

  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "p", text: `**${heading[1].replace(/\*\*/g, "")}**` });
      continue;
    }
    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);
    const item = bullet?.[1] ?? numbered?.[1];
    if (item !== undefined) {
      flushParagraph();
      const kind = bullet ? "ul" : "ol";
      if (list && list.kind !== kind) flushList();
      list ??= { kind, items: [] };
      list.items.push(item);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
}

/** **bold** parts become <strong>; leftover asterisks (an unfinished pair while streaming) are hidden. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
          <strong key={i} className="font-bold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          part.replace(/\*\*/g, "")
        ),
      )}
    </>
  );
}

export function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {parse(text).map((block, i) =>
        block.kind === "p" ? (
          <p key={i} dir="auto" className="whitespace-pre-line break-words">
            <Inline text={block.text} />
          </p>
        ) : (
          (() => {
            const List = block.kind;
            return (
              <List
                key={i}
                dir="auto"
                className={cn("space-y-1 ps-5", block.kind === "ul" ? "list-disc" : "list-decimal")}
              >
                {block.items.map((item, j) => (
                  <li key={j} className="break-words">
                    <Inline text={item} />
                  </li>
                ))}
              </List>
            );
          })()
        ),
      )}
    </div>
  );
}
