import { micromark } from 'micromark'
import { gfm, gfmHtml } from 'micromark-extension-gfm'

/**
 * Convert Markdown into clean, readable plain text for destinations that don't
 * render Markdown (X, mailto email). Strips syntax markers while keeping the
 * text, line structure, and link URLs.
 *
 * Intentionally dependency-free and good enough for typical note content —
 * not a full CommonMark parser.
 */
export function markdownToText(markdown: string): string {
  let text = markdown.replace(/\r\n/g, '\n')

  // Fenced code blocks: keep the inner code, drop the ``` fences.
  text = text.replace(/```[^\n]*\n([\s\S]*?)```/g, (_, code: string) =>
    code.replace(/\n$/, ''),
  )

  // Line-level markers.
  text = text
    .split('\n')
    .map((line) => {
      // Horizontal rule -> blank line.
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) return ''
      return line
        .replace(/^\s{0,3}#{1,6}\s+/, '') // heading markers
        .replace(/^\s{0,3}>\s?/, '') // blockquote markers
        .replace(/^(\s*)[*+]\s+/, '$1- ') // normalize bullets to "- "
    })
    .join('\n')

  // Inline constructs.
  text = text
    .replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (_, alt, url) => url || alt) // image -> url
    .replace(/\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (_, label, url) =>
      !label || label === url ? url : `${label} (${url})`,
    ) // link -> "label (url)"
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // italic
    .replace(/~~(.*?)~~/g, '$1') // strikethrough
    .replace(/`([^`]+)`/g, '$1') // inline code

  // Tidy whitespace.
  return text.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * The editor (Milkdown) preserves blank lines by serializing each empty
 * paragraph as a paragraph containing only `<br />`. That round-trips nicely
 * in the editor, but other destinations should get plain Markdown — so collapse
 * those standalone breaks back into real blank lines. Only matches a `<br>` that
 * is alone on its line, leaving genuine in-paragraph line breaks intact.
 */
export function stripEmptyLineBreaks(markdown: string): string {
  return markdown
    .replace(/\r\n/g, '\n')
    .replace(/^[ \t]*<br\s*\/?>[ \t]*$/gim, '') // empty-line marker → blank line
    .replace(/\n{3,}/g, '\n\n') // collapse the runs of blanks that leaves
    .replace(/^\n+|\n+$/g, '') // trim leading/trailing blank lines
}

/** Remove the first top-level `# ` heading (and a blank line after it). Used to
 *  drop the title from the body once it's been lifted into front matter. */
export function stripFirstH1(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const i = lines.findIndex((l) => /^#\s+\S/.test(l))
  if (i === -1) return markdown
  lines.splice(i, 1)
  if (lines[i] === '') lines.splice(i, 1) // collapse the gap the heading left
  return lines.join('\n').replace(/^\n+/, '')
}

/** Drop inline image syntax `![alt](url)`, leaving surrounding text intact. */
export function stripImages(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
}

/**
 * Inline styles keyed by tag name. Rich-text editors that accept pasted HTML —
 * notably WeChat's Official Accounts editor — strip `<style>` blocks and class
 * selectors, keeping only inline `style="…"` attributes. So everything that
 * should survive the paste has to be inlined here. Kept deliberately neutral so
 * the result reads well inside the target's own article frame.
 */
const HTML_STYLES: Record<string, string> = {
  h1: 'font-size:22px;font-weight:700;line-height:1.4;margin:24px 0 16px',
  h2: 'font-size:20px;font-weight:700;line-height:1.4;margin:24px 0 16px',
  h3: 'font-size:18px;font-weight:700;line-height:1.4;margin:20px 0 12px',
  h4: 'font-size:16px;font-weight:700;line-height:1.4;margin:20px 0 12px',
  p: 'font-size:16px;line-height:1.75;margin:16px 0;color:#333',
  blockquote:
    'border-left:4px solid #ddd;padding:8px 12px;margin:16px 0;color:#666;background:#f7f7f7',
  ul: 'margin:16px 0;padding-left:24px',
  ol: 'margin:16px 0;padding-left:24px',
  li: 'font-size:16px;line-height:1.75;margin:4px 0',
  a: 'color:#576b95;text-decoration:none',
  img: 'max-width:100%;height:auto',
  table: 'border-collapse:collapse;width:100%;margin:16px 0;font-size:14px',
  th: 'border:1px solid #ddd;padding:6px 12px;background:#f7f7f7;text-align:left',
  td: 'border:1px solid #ddd;padding:6px 12px',
  hr: 'border:none;border-top:1px solid #ddd;margin:24px 0',
}
const PRE_STYLE =
  'background:#f6f8fa;border-radius:6px;padding:16px;margin:16px 0;overflow-x:auto;' +
  'font-size:14px;line-height:1.5'
const PRE_CODE_STYLE = 'font-family:Menlo,Consolas,monospace;background:none;padding:0'
const INLINE_CODE_STYLE =
  'font-family:Menlo,Consolas,monospace;background:#f6f8fa;border-radius:3px;padding:2px 4px;font-size:90%'

/**
 * Render Markdown to HTML with every relevant tag carrying inline styles, ready
 * to drop on the clipboard as `text/html` and paste into a rich-text editor
 * (e.g. a WeChat article). Images keep their original `<img src>` URLs — the
 * editor fetches and re-hosts them on paste — so uploading to an image host
 * first is what makes them "land" in the published post.
 */
export function markdownToInlineHtml(markdown: string): string {
  const html = micromark(markdown, {
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  })
  let out = html
    // Code blocks first: <pre><code class="language-x"> → styled pair, so the
    // bare-<code> pass below only catches inline code.
    .replace(/<pre><code[^>]*>/g, `<pre style="${PRE_STYLE}"><code style="${PRE_CODE_STYLE}">`)
    .replace(/<code>/g, `<code style="${INLINE_CODE_STYLE}">`)
  for (const [tag, style] of Object.entries(HTML_STYLES)) {
    // Match the opening tag whether or not it has attributes, preserving them.
    out = out.replace(
      new RegExp(`<${tag}(\\s|>|/)`, 'g'),
      (_m, after: string) => `<${tag} style="${style}"${after === '>' ? '>' : ' '}`,
    )
  }
  return out
}
