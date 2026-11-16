import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, User, Trash2, Shield, Wifi, WifiOff, Paperclip } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { SYSTEM_IDENTITY, aiSuggestions, findBestAnswer } from '@/data/survivalKnowledge';
import { searchFiles } from '@/lib/fileSearch';

export default function SurvivalAITab() {
  const [messages, setMessages] = useState([{ role: 'ai', text: SYSTEM_IDENTITY }]);
  const [input, setInput] = useState('');
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
        const page = await base44.entities.KnowledgeFile.list({ sort: '-created_date', limit: 30 });
        const items = (page && page.items) || (Array.isArray(page) ? page : []);
        const hit = searchFiles(userText, items);
        if (hit) {
          text = `📄 **Dos teus ficheiros — ${hit.name}:**\n${hit.excerpt}\n\n— — —\n\n${text}`;
          files = [hit.name];
        }
      } catch (err) {
        // sem acesso aos ficheiros: responde só com o manual embarcado
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
      j % 2 === 0 ? part : <strong key={j} style={{ color: '#00ff41' }}>{part}</strong>
    );
  };

  return (
    <div className="p-4 flex flex-col" style={{ minHeight: 'calc(100vh - 140px)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield size={16} style={{ color: '#00ff41' }} />
          <h2 className="text-sm uppercase tracking-wider font-bold" style={{ color: '#00ff41' }}>
            Sobrevivência IA Mestre
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider" style={{ color: mode === 'online' ? '#00ff41aa' : '#ffaa00aa' }}>
            {mode === 'online' ? <Wifi size={10} /> : <WifiOff size={10} />}
            {mode === 'online' ? 'Online' : 'Offline'}
          </span>
          <button onClick={handleClear} className="p-1.5 hover:bg-white/5 rounded-sm" aria-label="Limpar conversa">
            <Trash2 size={12} style={{ color: '#00ff4166' }} />
          </button>
        </div>
      </div>

      <div className="p-2 rounded-sm mb-3" style={{ background: '#00ff4110', border: '1px solid #00ff4133' }}>
        <p className="text-[10px]" style={{ color: '#00ff4199' }}>
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
              style={{ background: msg.role === 'user' ? '#00aaff22' : '#00ff4122', border: `1px solid ${msg.role === 'user' ? '#00aaff44' : '#00ff4144'}` }}>
              {msg.role === 'user' ? <User size={14} style={{ color: '#00aaff' }} /> : <Shield size={14} style={{ color: '#00ff41' }} />}
            </div>
            <div className="flex-1 max-w-[85%]">
              {msg.role === 'ai' && msg.source && (
                <span className="text-[8px] uppercase tracking-wider block mb-1" style={{ color: msg.source === 'online' ? '#00ff4166' : '#ffaa0088' }}>
                  {msg.source === 'online' ? 'IA · ficheiros + web' : 'modo offline · manual embarcado'}
                  {msg.files && msg.files.length > 0 ? ` · ${msg.files.length} ficheiro(s)` : ''}
                </span>
              )}
              <div className="p-3 rounded-sm text-xs leading-relaxed whitespace-pre-line"
                style={{
                  background: msg.role === 'user' ? '#00aaff11' : '#001a0044',
                  border: `1px solid ${msg.role === 'user' ? '#00aaff22' : '#00ff4122'}`,
                  color: msg.role === 'user' ? '#00aaffcc' : '#00ff4199',
                }}>
                {renderText(msg.text)}
              </div>
            </div>
          </motion.div>
        ))}

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
            <div className="flex-shrink-0 w-7 h-7 rounded-sm flex items-center justify-center"
              style={{ background: '#00ff4122', border: '1px solid #00ff4144' }}>
              <Shield size={14} style={{ color: '#00ff41' }} />
            </div>
            <div className="p-3 rounded-sm" style={{ background: '#001a0044', border: '1px solid #00ff4122' }}>
              <div className="flex gap-1">
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: '#00ff41' }}
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
              style={{ background: '#001a0033', border: '1px solid #00ff4122', color: '#00ff4188' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 mb-2">
        <Paperclip size={10} style={{ color: '#00ff4155' }} />
        <a href="/conhecimento" className="text-[9px] uppercase tracking-wider" style={{ color: '#00ff4166' }}>
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
          style={{ background: '#0a0a0a', border: '1px solid #00ff4133', color: '#00ff41' }}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isTyping}
          className="px-3 rounded-sm transition-all"
          style={{
            background: input.trim() && !isTyping ? '#00ff4122' : '#001a0033',
            border: `1px solid ${input.trim() && !isTyping ? '#00ff4144' : '#00ff4111'}`,
            color: input.trim() && !isTyping ? '#00ff41' : '#00ff4144',
          }}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
