"use client";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatAskMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /^###\s+(.+)$/gm,
      '<h4 class="mt-3 mb-1 text-sm font-semibold text-heading-primary">$1</h4>',
    )
    .replace(
      /^##\s+(.+)$/gm,
      '<h3 class="mt-4 mb-2 text-base font-semibold text-heading-primary">$1</h3>',
    )
    .replace(
      /^#\s+(.+)$/gm,
      '<h2 class="mt-4 mb-2 text-lg font-bold text-heading-primary">$1</h2>',
    )
    .replace(/^-\s+(.+)$/gm, '<li class="ml-4 list-disc text-sm leading-relaxed">$1</li>')
    .replace(/(<li[\s\S]*?<\/li>)/g, '<ul class="my-2 space-y-1">$1</ul>')
    .replace(/\n/g, "<br />");
}

interface AskMarkdownProps {
  content: string;
  className?: string;
}

export function AskMarkdown({ content, className = "" }: AskMarkdownProps) {
  return (
    <div
      className={`text-sm leading-relaxed text-body ${className}`}
      dangerouslySetInnerHTML={{ __html: formatAskMarkdown(content) }}
    />
  );
}
