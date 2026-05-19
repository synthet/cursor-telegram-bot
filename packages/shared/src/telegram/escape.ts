export function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function formatCodeBlock(text: string): string {
  return `<pre>${escapeTelegramHtml(text)}</pre>`;
}
