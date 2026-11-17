// Markdown -> HTML seguro (as respostas da IA e os documentos não são de confiança).
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: true });

// Links abrem num separador novo
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') { node.setAttribute('target', '_blank'); node.setAttribute('rel', 'noopener noreferrer'); }
});

export function renderMarkdown(src) {
  const html = DOMPurify.sanitize(marked.parse(String(src || '')), { FORBID_TAGS: ['style', 'iframe', 'form', 'input'], FORBID_ATTR: ['style'] });
  // tabelas largas deslizam dentro da sua caixa em vez de alargar a página
  return html.replace(/<table/g, '<div class="md-table"><table').replace(/<\/table>/g, '</table></div>');
}
