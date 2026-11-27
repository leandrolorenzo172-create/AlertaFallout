// Protocolo de emergência (menu ≡ da aba CATÁSTROFES): passos imediatos, contactos úteis, kit e checklist.
import React, { useState } from 'react';
import { ShieldAlert, X, Phone, BookOpen, CheckSquare, Square } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { openProtocol } from './catTools';
import { t } from '@/i18n';

const CONTACTS = [
  ['112', 'Emergência (bombeiros, INEM, polícia) — grátis, de qualquer rede'],
  ['808 24 24 24', 'SNS 24 — aconselhamento de saúde'],
  ['800 250 250', 'Centro de Informação Antivenenos (CIAV)'],
  ['214 247 100', 'Autoridade Nacional de Emergência e Proteção Civil (ANEPC)'],
];
const STEPS = [
  ['Sismo', 'Baixar, proteger e aguardar: debaixo de uma mesa forte ou junto a uma parede interior, longe de janelas. Não uses o elevador. Depois do abalo, sai com calma e conta com réplicas.'],
  ['Incêndio florestal', 'Liga 112. Afasta-te do fumo, no sentido contrário ao vento. Em casa: fecha janelas, molha a envolvente, tem a mochila pronta e segue as ordens de evacuação.'],
  ['Cheia', 'Sobe para um ponto alto. Nunca atravesses estradas inundadas (30 cm de água em movimento derrubam um adulto). Desliga a luz e o gás se for seguro.'],
  ['Tempestade / aviso vermelho', 'Fica em casa, longe de janelas, árvores e estruturas soltas. Prende objetos na varanda. Tem lanterna, rádio a pilhas e telemóvel carregado.'],
];
const KIT = ['Água (3 L por pessoa e por dia)', 'Comida para 3 dias que não precise de frio', 'Lanterna e pilhas', 'Rádio a pilhas ou de manivela', 'Kit de primeiros socorros e medicação', 'Cópias dos documentos e dinheiro trocado', 'Powerbank carregado', 'Apito, manta térmica e roupa quente'];
const KEY = 'sd_protocol_checks';

export default function EmergencyProtocol() {
  const navigate = useNavigate();
  const [checks, setChecks] = useState(() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } });
  const toggle = (k) => { const n = { ...checks, [k]: !checks[k] }; setChecks(n); try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* sem armazenamento */ } };
  const done = KIT.filter((k) => checks[k]).length;
  const close = () => openProtocol(false);
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3" style={{ background: '#000000b3' }} role="dialog" aria-modal="true" aria-labelledby="proto-title" onClick={close}>
      <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto p-4 rounded-sm" style={{ background: 'rgb(var(--cd))', border: '1px solid #ef4444aa', boxShadow: '0 0 20px #ef444444' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert size={16} style={{ color: '#ef4444' }} />
          <h3 id="proto-title" className="flex-1 text-xs uppercase tracking-wider font-bold" style={{ color: '#ef4444' }}>{t('Protocolo de emergência')}</h3>
          <button type="button" onClick={close} aria-label={t('Fechar')} className="p-1 rounded-sm" style={{ border: '1px solid rgb(var(--c) / 0.3)' }}><X size={14} /></button>
        </div>
        <p className="text-[12px] font-bold mb-3 p-2 rounded-sm" style={{ background: '#ef444418', border: '1px solid #ef444466', color: '#ff6666' }}>{t('Em perigo imediato, liga 112 antes de tudo.')}</p>

        <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: '#ffaa00' }}>{t('Procedimentos imediatos')}</p>
        <dl className="space-y-2 mb-4 text-[11px]">
          {STEPS.map(([k, v]) => <div key={k}><dt className="font-bold uppercase tracking-wider" style={{ color: 'rgb(var(--c))' }}>{t(k)}</dt><dd style={{ color: 'rgb(var(--c) / 0.8)' }}>{t(v)}</dd></div>)}
        </dl>

        <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: '#ffaa00' }}>{t('Contactos úteis')}</p>
        <ul className="space-y-1.5 mb-4">
          {CONTACTS.map(([n, d]) => (
            <li key={n}><a href={`tel:${n.replace(/\s/g, '')}`} className="flex items-center gap-2 p-2 rounded-sm text-[11px]" style={{ border: '1px solid rgb(var(--c) / 0.25)', color: 'rgb(var(--c))' }}>
              <Phone size={13} className="shrink-0" /><b className="tabular-nums shrink-0">{n}</b><span className="min-w-0" style={{ color: 'rgb(var(--c) / 0.7)' }}>{t(d)}</span>
            </a></li>
          ))}
        </ul>

        <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: '#ffaa00' }}>{t('Kit de emergência')} ({done}/{KIT.length})</p>
        <ul className="grid sm:grid-cols-2 gap-1 mb-4">
          {KIT.map((k) => (
            <li key={k}><button type="button" onClick={() => toggle(k)} aria-pressed={!!checks[k]} className="w-full flex items-center gap-2 p-1.5 rounded-sm text-[11px] text-left" style={{ color: checks[k] ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.7)' }}>
              {checks[k] ? <CheckSquare size={13} className="shrink-0" /> : <Square size={13} className="shrink-0" />}{t(k)}
            </button></li>
          ))}
        </ul>
        <button type="button" onClick={() => { close(); navigate('/manual'); }} className="w-full flex items-center justify-center gap-2 py-2 rounded-sm text-xs uppercase tracking-wider" style={{ border: '1px solid rgb(var(--c) / 0.5)', color: 'rgb(var(--c))' }}>
          <BookOpen size={13} /> {t('Abrir o Guia de Sobrevivência (Manual)')}
        </button>
      </div>
    </div>
  );
}
