"use client";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatInline(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.9em] text-heading-primary">$1</code>')
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" class="font-medium text-emerald-700 underline underline-offset-2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
}

/**
 * Lightweight markdown for AreaIQ chat — headings, lists, tables, code, citations.
 */
export function formatAskMarkdown(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  let inUl = false;
  let inOl = false;
  let inCode = false;
  let codeBuf: string[] = [];
  let tableBuf: string[] = [];

  const closeLists = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  };

  const flushTable = () => {
    if (tableBuf.length === 0) return;
    const rows = tableBuf
      .filter((r) => !/^\s*\|?\s*[-:]+/.test(r))
      .map((r) =>
        r
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim()),
      );
    if (rows.length === 0) {
      tableBuf = [];
      return;
    }
    const [header, ...body] = rows;
    out.push(
      '<div class="my-3 overflow-x-auto rounded-xl border border-neutral-200"><table class="w-full min-w-[280px] border-collapse text-left text-sm">',
    );
    out.push("<thead><tr>");
    for (const cell of header) {
      out.push(
        `<th class="border-b border-neutral-200 bg-neutral-50 px-3 py-2 font-semibold text-heading-primary">${formatInline(cell)}</th>`,
      );
    }
    out.push("</tr></thead><tbody>");
    for (const row of body) {
      out.push("<tr>");
      for (let c = 0; c < header.length; c++) {
        out.push(
          `<td class="border-b border-neutral-100 px-3 py-2 text-body">${formatInline(row[c] ?? "")}</td>`,
        );
      }
      out.push("</tr>");
    }
    out.push("</tbody></table></div>");
    tableBuf = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      closeLists();
      flushTable();
      if (inCode) {
        out.push(
          `<pre class="my-3 overflow-x-auto rounded-xl bg-neutral-900 p-3 text-sm leading-relaxed text-neutral-100"><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`,
        );
        codeBuf = [];
        inCode = false;
      } else {
        inCode = true;
      }
      i += 1;
      continue;
    }

    if (inCode) {
      codeBuf.push(line);
      i += 1;
      continue;
    }

    if (/^\s*\|.+\|\s*$/.test(line) || /^\s*\|?\s*[-:]+\s*\|/.test(line)) {
      closeLists();
      tableBuf.push(line);
      i += 1;
      continue;
    }
    if (tableBuf.length) flushTable();

    if (/^###\s+/.test(line)) {
      closeLists();
      out.push(
        `<h4 class="mt-3 mb-1 text-base font-semibold text-heading-primary">${formatInline(line.replace(/^###\s+/, ""))}</h4>`,
      );
    } else if (/^##\s+/.test(line)) {
      closeLists();
      out.push(
        `<h3 class="mt-4 mb-2 text-lg font-semibold text-heading-primary">${formatInline(line.replace(/^##\s+/, ""))}</h3>`,
      );
    } else if (/^#\s+/.test(line)) {
      closeLists();
      out.push(
        `<h2 class="mt-4 mb-2 text-xl font-bold text-heading-primary">${formatInline(line.replace(/^#\s+/, ""))}</h2>`,
      );
    } else if (/^\d+\.\s+/.test(line)) {
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        out.push('<ol class="my-2 list-decimal space-y-1.5 pl-5 text-base leading-relaxed">');
        inOl = true;
      }
      out.push(`<li>${formatInline(line.replace(/^\d+\.\s+/, ""))}</li>`);
    } else if (/^[-*]\s+/.test(line)) {
      if (inOl) {
        out.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        out.push('<ul class="my-2 list-disc space-y-1.5 pl-5 text-base leading-relaxed">');
        inUl = true;
      }
      out.push(`<li>${formatInline(line.replace(/^[-*]\s+/, ""))}</li>`);
    } else if (/^>\s+/.test(line)) {
      closeLists();
      out.push(
        `<blockquote class="my-2 border-l-4 border-emerald-300 bg-emerald-50/50 px-3 py-2 text-base text-body">${formatInline(line.replace(/^>\s+/, ""))}</blockquote>`,
      );
    } else if (line.trim() === "") {
      closeLists();
      out.push('<div class="h-2"></div>');
    } else {
      closeLists();
      // Citation-style [1] footnotes
      const withCites = formatInline(line).replace(
        /\[(\d+)\]/g,
        '<sup class="ml-0.5 text-[0.7em] font-semibold text-emerald-700">[$1]</sup>',
      );
      out.push(`<p class="my-1.5 text-base leading-relaxed text-body">${withCites}</p>`);
    }
    i += 1;
  }

  closeLists();
  flushTable();
  if (inCode && codeBuf.length) {
    out.push(
      `<pre class="my-3 overflow-x-auto rounded-xl bg-neutral-900 p-3 text-sm leading-relaxed text-neutral-100"><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`,
    );
  }

  return out.join("");
}

interface AskMarkdownProps {
  content: string;
  className?: string;
  /** Show blinking caret while streaming */
  streaming?: boolean;
}

export function AskMarkdown({
  content,
  className = "",
  streaming = false,
}: AskMarkdownProps) {
  return (
    <div className={`ask-md text-base leading-relaxed text-body ${className}`}>
      <div dangerouslySetInnerHTML={{ __html: formatAskMarkdown(content) }} />
      {streaming ? (
        <span
          className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[2px] animate-pulse bg-emerald-600 align-middle"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
