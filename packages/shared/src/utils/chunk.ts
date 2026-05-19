const TELEGRAM_MAX_LENGTH = 4096;

export function chunkMessage(text: string, maxLength = TELEGRAM_MAX_LENGTH): string[] {
  if (text.length <= maxLength) return [text];
  const chunks: string[] = [];
  let offset = 0;
  while (offset < text.length) {
    let end = Math.min(offset + maxLength, text.length);
    if (end < text.length) {
      const lastNewline = text.lastIndexOf("\n", end);
      if (lastNewline > offset + maxLength * 0.5) {
        end = lastNewline + 1;
      }
    }
    chunks.push(text.slice(offset, end));
    offset = end;
  }
  return chunks;
}
