import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, User, Trash2, Shield, Wifi, WifiOff, Paperclip } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { SYSTEM_IDENTITY, aiSuggestions, findBestAnswer } from '@/data/survivalKnowledge';
import { searchDocs, refOf } from '@/lib/kb';

export default function SurvivalAITab() {
  const [messages, setMessages] = useState([{ role: 'ai', text: SYSTEM_IDENTITY }]);
  const [input, setInput] = useState(() => { try { const q = sessionStorage.getItem('ai_prefill') || ''; sessionStorage.removeItem('ai_prefill'); return q; } catch { return ''; } });
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState('online');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (text) => {
    const userText = (text || input).trim();
    if (!userText || isTyping) return;

    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await base44.functions.invoke('askMestre', { question: userText });
      const data = res?.data || {};
      const answer = (data.answer || '').trim();
      if (!answer) throw new Error('sem resposta');

      setMode('online');
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: answer, source: 'online', files: data.filesUsed || [] },
      ]);
    } catch (e) {
      setMode('offline');
      let text = findBestAnswer(userText);
      let files = [];

      try {
        // Procura nos documentos importados e cita o documento e a página/secção
        const hits = await searchDocs(userText, { limit: 2 });
        if (hits.length) {
          const blocks = hits.map((h) => `📄 **${refOf(h)}:**\n${h.excerpt}`).join('\n\n');
          text = `**DOS TEUS DOCUMENTOS:**\n${blocks}\n\n— — —\n\n**DO MANUAL INCLUÍDO NA APP:**\n${text}`;
          files = [...new Set(hits.map((h) => h.name))];
        }
      } catch (err) {
        // sem acesso aos documentos: responde só com o manual embarcado
      }

      setMessages((prev) => [...prev, { role: 'ai', text, source: 'offline', files }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClear = () => {
    setMessages([{ role: 'ai', text: SYSTEM_IDENTITY }]);
  };

  const renderText = (text) => {
    return text.split('**').map((part, j) =>
      j % 2 === 0 ? part : <strong key={j} style={{ color: 'rgb(var(--c))' }}>{part}</strong>
    );
  };

  return (
    <div className="p-4 flex flex-col" style={{ minHeight: 'calc(100vh - 140px)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield size={16} style={{ color: 'rgb(var(--c))' }} />
          <h2 className="text-sm uppercase tracking-wider font-bold" style={{ color: 'rgb(var(--c))' }}>
            Sobrevivência IA Mestre
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider" style={{ color: mode === 'online' ? 'rgb(var(--c) / 0.67)' : '#ffaa00aa' }}>
            {mode === 'online' ? <Wifi size={10} /> : <WifiOff size={10} />}
            {mode === 'online' ? 'Online' : 'Offline'}
          </span>
          <button onClick={handleClear} className="p-1.5 hover:bg-white/5 rounded-sm" aria-label="Limpar conversa">
            <Trash2 size={12} style={{ color: 'rgb(var(--c) / 0.4)' }} />
          </button>
        </div>
      </div>

      <div className="p-2 rounded-sm mb-3" style={{ background: 'rgb(var(--c) / 0.06)', border: '1px solid rgb(var(--c) / 0.2)' }}>
        <p className="text-[10px]" style={{ color: 'rgb(var(--c) / 0.6)' }}>
          ⚡ Ficheiros locais + conhecimento externo · fallback tático offline (FM 21-76)
        </p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1" style={{ maxHeight: '50vh' }}>
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className="flex-shrink-0 w-7 h-7 rounded-sm flex items-center justify-center"
              style={{ background: msg.role === 'user' ? '#00aaff22' : 'rgb(var(--c) / 0.13)', border: `1px solid ${msg.role === 'user' ? '#00aaff44' : 'rgb(var(--c) / 0.27)'}` }}>
              {msg.role === 'user' ? <User size={14} style={{ color: '#00aaff' }} /> : <Shield size={14} style={{ color: 'rgb(var(--c))' }} />}
            </div>
            <div className="flex-1 max-w-[85%]">
              {msg.role === 'ai' && msg.source && (
                <span className="text-[8px] uppercase tracking-wider block mb-1" style={{ color: msg.source === 'online' ? 'rgb(var(--c) / 0.4)' : '#ffaa0088' }}>
                  {msg.source === 'online' ? 'IA · ficheiros + web' : 'modo offline · manual embarcado'}
                  {msg.files && msg.files.length > 0 ? ` · ${msg.files.length} ficheiro(s)` : ''}
                </span>
              )}
              <div className="p-3 rounded-sm text-xs leading-relaxed whitespace-pre-line"
                style={{
                  background: msg.role === 'user' ? '#00aaff11' : 'rgb(var(--cd) / 0.27)',
                  border: `1px solid ${msg.role === 'user' ? '#00aaff22' : 'rgb(var(--c) / 0.13)'}`,
                  color: msg.role === 'user' ? '#00aaffcc' : 'rgb(var(--c) / 0.6)',
                }}>
                {renderText(msg.text)}
              </div>
            </div>
          </motion.div>
        ))}

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
            <div className="flex-shrink-0 w-7 h-7 rounded-sm flex items-center justify-center"
              style={{ background: 'rgb(var(--c) / 0.13)', border: '1px solid rgb(var(--c) / 0.27)' }}>
              <Shield size={14} style={{ color: 'rgb(var(--c))' }} />
            </div>
            <div className="p-3 rounded-sm" style={{ background: 'rgb(var(--cd) / 0.27)', border: '1px solid rgb(var(--c) / 0.13)' }}>
              <div className="flex gap-1">
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'rgb(var(--c))' }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {aiSuggestions.slice(0, 4).map((s) => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              className="px-2.5 py-1.5 rounded-sm text-[10px] uppercase tracking-wider transition-all hover:bg-white/5"
              style={{ background: 'rgb(var(--cd) / 0.2)', border: '1px solid rgb(var(--c) / 0.13)', color: 'rgb(var(--c) / 0.53)' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 mb-2">
        <Paperclip size={10} style={{ color: 'rgb(var(--c) / 0.33)' }} />
        <a href="/conhecimento" className="text-[9px] uppercase tracking-wider" style={{ color: 'rgb(var(--c) / 0.4)' }}>
          Gerir ficheiros da IA
        </a>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Indique o cenário de sobrevivência..."
          className="flex-1 p-2.5 rounded-sm text-xs outline-none"
          style={{ background: '#0a0a0a', border: '1px solid rgb(var(--c) / 0.2)', color: 'rgb(var(--c))' }}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isTyping}
          className="px-3 rounded-sm transition-all"
          style={{
            background: input.trim() && !isTyping ? 'rgb(var(--c) / 0.13)' : 'rgb(var(--cd) / 0.2)',
            border: `1px solid ${input.trim() && !isTyping ? 'rgb(var(--c) / 0.27)' : 'rgb(var(--c) / 0.07)'}`,
            color: input.trim() && !isTyping ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.27)',
          }}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
