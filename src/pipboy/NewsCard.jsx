import React from 'react';
import { motion } from 'framer-motion';

function severityColor(sev) {
  if (sev >= 8) return '#ff0000';
  if (sev >= 6) return '#ff6600';
  if (sev >= 4) return '#ffaa00';
  return '#00ff41';
}

export default function NewsCard({ article, index = 0 }) {
  const sev = Math.round(Number(article.severity) || 0);
  const color = severityColor(sev);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="mb-3 p-3 rounded-sm"
      style={{ background: '#001a0088', border: '1px solid #00ff4122', borderLeft: `3px solid ${color}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold leading-snug min-w-0" style={{ color: '#00ff41' }}>{article.title}</h3>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm shrink-0 tabular-nums" style={{ color, border: `1px solid ${color}66` }}>
          {sev}/10
        </span>
      </div>
      {article.summary && (
        <p className="text-xs mt-2 leading-relaxed" style={{ color: '#00ff41aa' }}>{article.summary}</p>
      )}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] uppercase tracking-wider" style={{ color: '#00ff4166' }}>
        {article.region && <span>{article.region}</span>}
        {(article.category || article.type) && <span>{String(article.category || article.type).replace(/_/g, ' ')}</span>}
        {article.source && <span>Fonte: {article.source}</span>}
        {article.url && (
          <a href={article.url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#00ff41' }}>
            Ler notícia ↗
          </a>
        )}
      </div>
    </motion.div>
  );
}
