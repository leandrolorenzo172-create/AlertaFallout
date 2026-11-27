// Aba IDU (ID Utilizador): ficha de identificação, contactos de emergência e ficha médica.
// Modo consulta (leitura rápida, botões de chamada) e modo edição (GUARDAR FICHA IDU). O menu ≡ desta aba é o ecrã SOS.
import React, { useEffect, useRef, useState } from 'react';
import { IdCard, UserRound, Contact, HeartPulse, Phone, Pencil, Save, X, AlertTriangle, Droplet } from 'lucide-react';
import { Header, card } from './IndicatorParts';
import { useIdu, saveProfile, emptyProfile, ageFrom, BLOOD_GROUPS, useEditRequest, clearEditRequest, isEmpty } from '@/idu/iduStore';
import { useSos, stopAllSos, toggleSosStrobe } from '@/idu/sos';
import { useBackupFlow, confirmRestore, cancelRestore } from '@/backup/backupFlow';
import RestoreDialog from '@/backup/RestoreDialog';
import { t, locale } from '@/i18n';

const RED = '#ef4444';
const DRAFT = 'sd_idu_draft'; // rascunho do formulário: não se perde o que foi escrito se a app fechar
const label = 'block text-[10px] uppercase tracking-wider mb-1';
const input = { background: 'rgb(var(--cb) / 0.7)', border: '1px solid rgb(var(--c) / 0.3)', color: 'rgb(var(--c))' };
const btn = { background: 'rgb(var(--cb) / 0.6)', border: '1px solid rgb(var(--c) / 0.35)', color: 'rgb(var(--c))' };
const dim = { color: 'rgb(var(--c) / 0.6)' };

// ---------- consulta ----------
function Row({ k, v, warn }) {
  if (!v) return null;
  return (
    <div className="py-1.5" style={{ borderTop: '1px solid rgb(var(--c) / 0.1)' }}>
      <p className="text-[10px] uppercase tracking-wider" style={dim}>{k}</p>
      <p className="text-sm whitespace-pre-wrap break-words" style={{ color: warn ? RED : 'rgb(var(--c))' }}>{v}</p>
    </div>
  );
}
function Section({ icon: Icon, title, children, alert }) {
  return (
    <section className="p-3 rounded-sm mb-3" style={{ ...card, ...(alert ? { border: `1px solid ${RED}88`, boxShadow: `0 0 12px ${RED}33` } : null) }}>
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--c))' }}><Icon size={14} /> {title}</h3>
      {children}
    </section>
  );
}
function ContactCard({ c, n }) {
  if (!c?.name && !c?.phone) return null;
  return (
    <div className="flex items-center gap-3 p-2 rounded-sm mb-2" style={{ background: 'rgb(var(--cb) / 0.5)', border: '1px solid rgb(var(--c) / 0.2)' }}>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider" style={dim}>{n === 1 ? t('Contacto principal') : t('2.º contacto')}{c.relation ? ` · ${c.relation}` : ''}</p>
        <p className="text-sm font-bold truncate">{c.name || '—'}</p>
        <p className="text-xs tabular-nums" style={dim}>{c.phone || t('sem número')}</p>
      </div>
      {c.phone && (
        <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 px-3 py-2 rounded-sm text-[11px] uppercase tracking-wider font-bold shrink-0" style={{ ...btn, border: '1px solid rgb(var(--c))', boxShadow: '0 0 10px rgb(var(--c) / 0.3)' }}>
          <Phone size={13} /> {t('Ligar')}
        </a>
      )}
    </div>
  );
}

function ProfileView({ p, onEdit }) {
  const age = ageFrom(p.birth);
  const birth = p.birth ? new Date(`${p.birth}T00:00:00`).toLocaleDateString(locale()) : '';
  const hasContacts = p.contact1.phone || p.contact2.phone || p.contact1.name || p.contact2.name;
  return (
    <>
      <Section icon={UserRound} title={t('Identificação')}>
        <p className="text-lg font-bold leading-tight" style={{ textShadow: '0 0 8px rgb(var(--c) / 0.4)' }}>{p.name || t('Sem nome')}</p>
        {(birth || age != null) && <p className="text-xs mb-1" style={dim}>{birth}{age != null ? ` · ${t('{n} anos', { n: age })}` : ''}</p>}
        <Row k={t('Morada / cidade')} v={p.address} />
        <Row k={t('Documento de identificação')} v={p.docId} />
        <Row k={t('Observações')} v={p.idNotes} />
      </Section>

      <Section icon={Contact} title={t('Contactos de emergência')}>
        {hasContacts ? <><ContactCard c={p.contact1} n={1} /><ContactCard c={p.contact2} n={2} /></> : <p className="text-xs" style={{ color: '#ffaa00' }}>{t('Sem contacto de emergência. O SMS SOS e a ligação ao contacto precisam de um número.')}</p>}
      </Section>

      <Section icon={HeartPulse} title={t('Ficha médica')} alert={p.allergiesCritical && !!p.allergies}>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-16 h-16 rounded-sm shrink-0" style={{ border: `2px solid ${p.blood ? RED : 'rgb(var(--c) / 0.3)'}`, boxShadow: p.blood ? `0 0 12px ${RED}44` : 'none' }} aria-label={t('Grupo sanguíneo')}>
            <span className="text-xl font-bold" style={{ color: p.blood ? RED : 'rgb(var(--c) / 0.5)' }}>{p.blood || '?'}</span>
          </div>
          <div className="text-[11px]" style={dim}><Droplet size={12} className="inline mr-1" />{t('Grupo sanguíneo')}<br />{p.blood ? '' : t('não definido')}</div>
        </div>
        {p.allergies && (
          <div className="p-2 rounded-sm mb-1" style={p.allergiesCritical ? { background: `${RED}18`, border: `1px solid ${RED}` } : { borderTop: '1px solid rgb(var(--c) / 0.1)' }}>
            <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold" style={{ color: p.allergiesCritical ? RED : 'rgb(var(--c) / 0.6)' }}>
              {p.allergiesCritical && <AlertTriangle size={12} />} {p.allergiesCritical ? t('Alergias críticas') : t('Alergias')}
            </p>
            <p className="text-sm whitespace-pre-wrap" style={{ color: p.allergiesCritical ? RED : 'rgb(var(--c))' }}>{p.allergies}</p>
          </div>
        )}
        <Row k={t('Medicação atual')} v={p.medication} />
        <Row k={t('Condições médicas / notas clínicas')} v={p.conditions} />
        {!p.allergies && !p.medication && !p.conditions && !p.blood && <p className="text-xs" style={dim}>{t('Ficha médica por preencher.')}</p>}
      </Section>

      <button type="button" onClick={onEdit} className="w-[calc(100%-64px)] sm:w-full flex items-center justify-center gap-2 py-3 rounded-sm text-xs uppercase tracking-wider font-bold" style={btn}><Pencil size={14} /> {t('Editar ficha')}</button>
      {p.updated > 0 && <p className="text-[10px] text-center mt-2" style={dim}>{t('Atualizada em {d}', { d: new Date(p.updated).toLocaleString(locale()) })}</p>}
    </>
  );
}

// ---------- edição ----------
function Field({ id, k, value, onChange, type = 'text', area, placeholder, ...rest }) {
  const common = { id, value: value || '', onChange: (e) => onChange(e.target.value), placeholder, className: 'w-full px-2 py-2 rounded-sm text-sm outline-none focus:ring-1', style: input, ...rest };
  return (
    <div className="mb-3">
      <label htmlFor={id} className={label} style={dim}>{k}</label>
      {area ? <textarea rows={3} {...common} /> : <input type={type} {...common} />}
    </div>
  );
}

function ProfileForm({ initial, onDone, notice }) {
  const [d, setD] = useState(() => { try { const r = JSON.parse(localStorage.getItem(DRAFT) || 'null'); if (r) return { ...initial, ...r, contact1: { ...initial.contact1, ...r.contact1 }, contact2: { ...initial.contact2, ...r.contact2 } }; } catch { /* sem rascunho */ } return initial; });
  const [msg, setMsg] = useState('');
  useEffect(() => { const id = setTimeout(() => { try { localStorage.setItem(DRAFT, JSON.stringify(d)); } catch { /* sem espaço */ } }, 400); return () => clearTimeout(id); }, [d]);
  const f = (k) => (v) => setD((x) => ({ ...x, [k]: v }));
  const fc = (n, k) => (v) => setD((x) => ({ ...x, [n]: { ...x[n], [k]: v } }));
  const phoneOk = (s) => !s || /^\+?\d[\d\s-]{2,}$/.test(s.trim());
  const submit = (e) => {
    e.preventDefault();
    if (!phoneOk(d.contact1.phone) || !phoneOk(d.contact2.phone)) { setMsg(t('Número de telefone inválido (só dígitos, espaços e + no início).')); return; }
    saveProfile(d); localStorage.removeItem(DRAFT); onDone(true);
  };
  const cancel = () => { localStorage.removeItem(DRAFT); clearEditRequest(); onDone(false); };

  return (
    <form onSubmit={submit} noValidate>
      {notice && <p role="alert" className="p-2 mb-3 rounded-sm text-xs" style={{ border: '1px solid #ffaa00', color: '#ffaa00', background: '#ffaa0014' }}>{notice}</p>}
      <Section icon={UserRound} title={t('Identificação')}>
        <Field id="idu-name" k={t('Nome completo')} value={d.name} onChange={f('name')} autoComplete="name" />
        <Field id="idu-birth" k={t('Data de nascimento')} value={d.birth} onChange={f('birth')} type="date" max={new Date().toISOString().slice(0, 10)} />
        <Field id="idu-address" k={t('Morada / cidade de referência')} value={d.address} onChange={f('address')} autoComplete="street-address" />
        <Field id="idu-doc" k={t('N.º de identificação / documento (opcional)')} value={d.docId} onChange={f('docId')} />
        <Field id="idu-idnotes" k={t('Observações de identificação')} value={d.idNotes} onChange={f('idNotes')} area placeholder={t('Ex.: sinais particulares, idioma, óculos…')} />
      </Section>

      <Section icon={Contact} title={t('Contactos de emergência')}>
        {[1, 2].map((n) => (
          <fieldset key={n} className="mb-2">
            <legend className="text-[10px] uppercase tracking-wider font-bold mb-2" style={{ color: 'rgb(var(--c) / 0.8)' }}>{n === 1 ? t('Contacto principal') : t('2.º contacto (opcional)')}</legend>
            <Field id={`idu-contact${n}-name`} k={t('Nome')} value={d[`contact${n}`].name} onChange={fc(`contact${n}`, 'name')} />
            <Field id={`idu-contact${n}-relation`} k={t('Parentesco / relação')} value={d[`contact${n}`].relation} onChange={fc(`contact${n}`, 'relation')} placeholder={t('Ex.: mãe, irmão, amigo')} />
            <Field id={`idu-contact${n}-phone`} k={t('Telefone')} value={d[`contact${n}`].phone} onChange={fc(`contact${n}`, 'phone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="+351 9xx xxx xxx" />
          </fieldset>
        ))}
      </Section>

      <Section icon={HeartPulse} title={t('Ficha médica')}>
        <div className="mb-3">
          <label htmlFor="idu-blood" className={label} style={dim}>{t('Grupo sanguíneo')}</label>
          <select id="idu-blood" value={d.blood} onChange={(e) => f('blood')(e.target.value)} className="w-full px-2 py-2 rounded-sm text-sm" style={input}>
            {BLOOD_GROUPS.map((g) => <option key={g || 'none'} value={g}>{g || t('Não definido')}</option>)}
          </select>
        </div>
        <Field id="idu-allergies" k={t('Alergias')} value={d.allergies} onChange={f('allergies')} area placeholder={t('Medicamentos, alimentos, picadas, substâncias…')} />
        <label className="flex items-center gap-2 text-[11px] mb-3 -mt-1 cursor-pointer" style={{ color: d.allergiesCritical ? RED : 'rgb(var(--c) / 0.85)' }}>
          <input type="checkbox" checked={d.allergiesCritical} onChange={(e) => f('allergiesCritical')(e.target.checked)} style={{ accentColor: RED }} />
          {t('Alergia crítica (risco de vida / anafilaxia)')}
        </label>
        <Field id="idu-medication" k={t('Medicação atual')} value={d.medication} onChange={f('medication')} area placeholder={t('Fármaco, dose e horário')} />
        <Field id="idu-conditions" k={t('Condições médicas / notas clínicas')} value={d.conditions} onChange={f('conditions')} area placeholder={t('Ex.: asma, diabetes, hipertensão, pacemaker, n.º de utente, seguro')} />
      </Section>

      {msg && <p role="alert" className="text-xs mb-2" style={{ color: RED }}>{msg}</p>}
      <div className="flex gap-2 pr-16 sm:pr-0">
        <button type="submit" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-sm text-xs uppercase tracking-wider font-bold" style={{ ...btn, border: '1px solid rgb(var(--c))', boxShadow: '0 0 12px rgb(var(--c) / 0.35)' }}><Save size={14} /> {t('Guardar ficha IDU')}</button>
        <button type="button" onClick={cancel} className="flex items-center justify-center gap-1 px-4 py-3 rounded-sm text-xs uppercase tracking-wider" style={btn}><X size={14} /> {t('Cancelar')}</button>
      </div>
      <p className="text-[10px] mt-2" style={dim}>{t('Os dados ficam só neste aparelho. O rascunho é guardado enquanto escreves.')}</p>
    </form>
  );
}

// Ecrã estroboscópico (quando o browser não deixa usar o flash): branco/vermelho em Morse SOS. Tocar para parar.
function StrobeOverlay() {
  const s = useSos();
  if (s.strobe !== 'screen') return null;
  return (
    <button type="button" onClick={toggleSosStrobe} aria-label={t('Parar SOS luminoso')}
      className="fixed inset-0 z-[2000] flex items-end justify-center pb-10" style={{ background: s.lit ? '#ffffff' : '#ff0000' }}>
      <span className="px-4 py-2 rounded-sm text-sm font-bold uppercase tracking-wider" style={{ background: '#000000cc', color: '#ffaa00' }}>{t('SOS luminoso · toca para parar')}</span>
    </button>
  );
}

// Importar perfil (menu ≡): progresso, resultado e confirmação Fundir / Substituir
function ImportStatus() {
  const b = useBackupFlow();
  return (
    <>
      {(b.busy || b.msg) && (
        <p role="status" className="fixed left-4 right-20 bottom-24 z-40 p-2 rounded-sm text-[11px]" style={{ background: 'rgb(var(--cd) / 0.95)', border: `1px solid ${b.msg?.err ? RED : '#ffaa00'}88`, color: b.msg?.err ? RED : '#ffaa00' }}>
          {b.busy || b.msg.text}
        </p>
      )}
      <RestoreDialog pending={b.pending} onPick={confirmRestore} onCancel={cancelRestore} />
    </>
  );
}

export default function IduTab() {
  const p = useIdu();
  const req = useEditRequest();
  const [editing, setEditing] = useState(() => isEmpty(p));
  const [saved, setSaved] = useState(false);
  const top = useRef(null);

  // pedido vindo do menu SOS (ex.: falta o número): abre a edição e foca o campo
  useEffect(() => {
    if (!req) return;
    setEditing(true);
    setTimeout(() => { const el = document.getElementById(`idu-${req.field.replace('.', '-')}`); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); el?.focus({ preventScroll: true }); }, 250);
  }, [req]);
  // sirene e estroboscópio param ao sair da aba
  useEffect(() => () => stopAllSos(), []);

  const done = (ok) => { setEditing(false); setSaved(ok); top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); if (ok) setTimeout(() => setSaved(false), 3000); };

  return (
    <div ref={top} className="p-4 max-w-2xl mx-auto pb-28 scroll-mt-20">
      <Header icon={IdCard} title={t('ID Utilizador')} />
      <p className="text-[11px] mb-3" style={dim}>{t('Ficha para emergências. O botão ≡ desta aba abre o ecrã SOS.')}</p>
      {saved && <p role="status" className="text-xs mb-3" style={{ color: '#ffaa00' }}>{t('✔ Ficha IDU guardada.')}</p>}
      {editing ? <ProfileForm initial={p.updated ? p : emptyProfile()} onDone={done} notice={req?.msg} /> : <ProfileView p={p} onEdit={() => setEditing(true)} />}
      <StrobeOverlay />
      <ImportStatus />
    </div>
  );
}
