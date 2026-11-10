// Renderer mínimo de Markdown para enunciados y explicaciones (contenido propio).
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function inline(s: string): string {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
}

export function markdownToHtml(md: string): string {
  const out: string[] = []
  const lines = md.split('\n')
  let i = 0
  while (i < lines.length) {
    const l = lines[i]
    if (l.startsWith('```')) {
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++])
      i++
      out.push(`<pre class="codeblock"><code>${esc(buf.join('\n'))}</code></pre>`)
    } else if (/^\s*- /.test(l)) {
      const buf: string[] = []
      while (i < lines.length && /^\s*- /.test(lines[i])) buf.push(`<li>${inline(lines[i++].replace(/^\s*- /, ''))}</li>`)
      out.push(`<ul>${buf.join('')}</ul>`)
    } else if (/^\d+\. /.test(l)) {
      const buf: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) buf.push(`<li>${inline(lines[i++].replace(/^\d+\. /, ''))}</li>`)
      out.push(`<ol>${buf.join('')}</ol>`)
    } else if (l.trim() === '') {
      i++
    } else {
      const buf: string[] = []
      while (i < lines.length && lines[i].trim() !== '' && !/^(\s*- |\d+\. |```)/.test(lines[i])) buf.push(inline(lines[i++]))
      out.push(`<p>${buf.join('<br/>')}</p>`)
    }
  }
  return out.join('\n')
}

export function Markdown({ text, className = '' }: { text: string; className?: string }) {
  return <div className={`prose-lab ${className}`} dangerouslySetInnerHTML={{ __html: markdownToHtml(text) }} />
}
