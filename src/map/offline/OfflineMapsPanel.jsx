// Painel "Mapas offline" (aba MAPA > menu ≡): guardar a área do ecrã ou zonas preparadas, progresso real,
// áreas guardadas, espaço ocupado e pacote PMTiles de Portugal.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Download, Trash2, MapPinned, HardDrive, Package, ShieldCheck, Mountain, Route, Eye } from 'lucide-react';
import { OFFLINE_LAYERS, PRESET_AREAS, MAX_TILES, estimateArea, saveArea, deleteArea, storageReport, importPack, deletePack, requestPersist } from './offlineMapManager';
import { t } from '@/i18n';

const MB = (b) => `${(b / 1048576).toFixed(b > 1048576 * 100 ? 0 : 1)} MB`;
const box = { background: 'rgb(var(--cb) / 0.6)', border: '1px solid rgb(var(--c) / 0.25)' };
const btn = (on) => ({ background: on ? 'rgb(var(--c) / 0.16)' : 'rgb(var(--cb) / 0.7)', border: `1px solid ${on ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.3)'}`, color: 'rgb(var(--c))' });
const fmtBbox = (b) => `${b.s.toFixed(3)}, ${b.w.toFixed(3)} → ${b.n.toFixed(3)}, ${b.e.toFixed(3)}`;

export default function OfflineMapsPanel({ getViewBbox, defaultLayer = 'road', onFly, onClose }) {
  const [target, setTarget] = useState(() => ({ name: t('Área do ecrã'), bbox: getViewBbox() }));
  const [layer, setLayer] = useState(OFFLINE_LAYERS[defaultLayer] ? defaultLayer : 'road');
  const [maxZoom, setMaxZoom] = useState(16);
  const [dem, setDem] = useState(true);
  const [graph, setGraph] = useState(true);
  const [prog, setProg] = useState(null); // { phase, done, total, msg }
  const [msg, setMsg] = useState('');
  const [rep, setRep] = useState(null);
  const ctrl = useRef(null);
  const est = estimateArea(target.bbox, 10, maxZoom, layer);

  const refresh = useCallback(() => storageReport().then(setRep).catch(() => {}), []);
  useEffect(() => { refresh(); }, [refresh]);

  const start = async () => {
    if (est.tooBig || prog) return;
    if (navigator.onLine === false) { setMsg(t('Para guardar uma área é preciso rede. Depois funciona sem ela.')); return; }
    await requestPersist(); // pede ao browser para não apagar os mapas quando o espaço aperta
    ctrl.current = new AbortController(); setMsg('');
    setProg({ phase: 'mapa', done: 0, total: est.tiles, msg: t('A começar…') });
    try {
      const a = await saveArea({ name: target.name, bbox: target.bbox, layer, minZoom: 10, maxZoom, dem, graph }, (p) => setProg((o) => ({ ...o, ...p })), ctrl.current.signal);
      setMsg(`${t('✔ «{n}» guardada: {m}. Já funciona sem rede.', { n: a.name, m: MB(a.bytes) })}${a.warnings?.length ? ` ${t('Atenção: falhou {w} (servidor sem resposta). Tenta guardar de novo mais tarde.', { w: a.warnings.map((w) => t(w === 'rotas' ? 'a malha de rotas' : 'o relevo')).join(t(' e ')) })}` : ''}`);
    } catch (e) {
      setMsg(e.name === 'AbortError' ? t('Download cancelado. O que já foi descarregado ficou guardado.') : e.message);
    } finally { setProg(null); ctrl.current = null; refresh(); }
  };
  const pct = prog?.total ? Math.round((prog.done / prog.total) * 100) : 0;

  const onPack = async (file) => {
    if (!file) return; setMsg(t('A validar o pacote…'));
    try { const h = await importPack(file); setMsg(t('✔ Pacote importado: zoom {a}–{b}, {t}. O mapa usa-o quando não há mosaicos guardados.', { a: h.minZoom, b: h.maxZoom, t: h.tileType.toUpperCase() })); }
    catch (e) { setMsg(e.message); }
    refresh();
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3" style={{ background: '#000000b3' }} role="dialog" aria-modal="true" aria-labelledby="offmap-title" onClick={() => !prog && onClose()}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 rounded-sm text-[11px]" style={{ background: 'rgb(var(--cd))', border: '1px solid rgb(var(--c) / 0.6)', boxShadow: '0 0 18px rgb(var(--c) / 0.3)', color: 'rgb(var(--c))' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <MapPinned size={16} /><h3 id="offmap-title" className="flex-1 text-xs uppercase tracking-wider font-bold">{t('Mapas offline')}</h3>
          <button type="button" onClick={onClose} disabled={!!prog} aria-label={t('Fechar')} className="p-1 rounded-sm disabled:opacity-30" style={btn(false)}><X size={14} /></button>
        </div>

        {/* Espaço ocupado */}
        {rep && (
          <div className="p-2 rounded-sm mb-3 flex items-center gap-2" style={box}>
            <HardDrive size={14} className="shrink-0" />
            <span className="flex-1">{t('Mapas: {m} · aparelho: {u} de {q}', { m: MB(rep.mapsBytes), u: MB(rep.usage), q: MB(rep.quota) })}</span>
            {rep.persisted ? <span className="flex items-center gap-1 text-[10px]"><ShieldCheck size={12} />{t('protegidos')}</span>
              : <button type="button" onClick={async () => { await requestPersist(); refresh(); }} className="px-2 py-0.5 rounded-sm text-[10px] uppercase" style={btn(false)}>{t('Proteger')}</button>}
          </div>
        )}

        {/* Guardar área */}
        <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: '#ffaa00' }}>{t('Guardar uma área')}</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          <button type="button" disabled={!!prog} onClick={() => setTarget({ name: t('Área do ecrã'), bbox: getViewBbox() })} className="px-2 py-1 rounded-full text-[10px] uppercase" style={btn(target.name === t('Área do ecrã'))}>{t('Área do ecrã')}</button>
          {PRESET_AREAS.map((p) => (
            <button key={p.id} type="button" disabled={!!prog} onClick={() => { setTarget({ name: p.name, bbox: p.bbox }); setMaxZoom(p.maxZoom); onFly?.(p.bbox); }} className="px-2 py-1 rounded-full text-[10px] uppercase" style={btn(target.name === p.name)}>{t(p.name)}</button>
          ))}
        </div>
        <p className="mb-2 opacity-70">{fmtBbox(target.bbox)} · ≈ {Math.round(est.km2)} km²</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <label className="flex flex-col gap-1"><span className="opacity-70">{t('Camada')}</span>
            <select value={layer} disabled={!!prog} onChange={(e) => setLayer(e.target.value)} className="p-1.5 rounded-sm" style={{ ...btn(false), outline: 'none' }}>
              {Object.entries(OFFLINE_LAYERS).map(([k, v]) => <option key={k} value={k}>{t(v.label)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1"><span className="opacity-70">{t('Zoom (pormenor)')}</span>
            <select value={maxZoom} disabled={!!prog} onChange={(e) => setMaxZoom(Number(e.target.value))} className="p-1.5 rounded-sm" style={{ ...btn(false), outline: 'none' }}>
              {[13, 14, 15, 16].map((z) => <option key={z} value={z}>10 – {z}{z === 16 ? ` (${t('ruas')})` : z === 14 ? ` (${t('trilhos')})` : ''}</option>)}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-3 mb-2">
          <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={dem} disabled={!!prog} onChange={(e) => setDem(e.target.checked)} style={{ accentColor: 'rgb(var(--c))' }} /><Mountain size={12} />{t('Relevo (altitude, D+/D−)')}</label>
          <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={graph} disabled={!!prog || !est.graphOk} onChange={(e) => setGraph(e.target.checked)} style={{ accentColor: 'rgb(var(--c))' }} /><Route size={12} />{t('Rotas a pé offline')}</label>
        </div>
        <p className="mb-2" style={{ color: est.tooBig ? '#ef4444' : 'rgb(var(--c) / 0.8)' }}>
          {t('{n} mosaicos · ≈ {m} (mapa {a} + relevo {b}{c})', { n: est.tiles.toLocaleString('pt-PT'), m: `${Math.ceil(est.mapMB + (dem ? est.demMB : 0) + (graph && est.graphOk ? est.graphMB : 0))} MB`, a: `${Math.ceil(est.mapMB)} MB`, b: `${Math.ceil(est.demMB)} MB`, c: graph && est.graphOk ? ` + ${t('rotas')} ${Math.ceil(est.graphMB)} MB` : '' })}
          {est.tooBig && <><br />{t('Acima do limite de {m} mosaicos por área: aproxima o mapa ou baixa o zoom. Para o país inteiro usa o pacote PMTiles.', { m: MAX_TILES })}</>}
          {!est.graphOk && graph && <><br />{t('Área grande demais para a malha de rotas (máx. 900 km²): o mapa e o relevo guardam-se na mesma.')}</>}
        </p>
        {prog ? (
          <div className="mb-3">
            <div className="h-3 rounded-sm overflow-hidden mb-1" style={{ background: 'rgb(var(--cb))', border: '1px solid rgb(var(--c) / 0.35)' }}>
              <div className="h-full" style={{ width: `${pct}%`, background: 'rgb(var(--c))', boxShadow: '0 0 8px rgb(var(--c) / 0.6)', transition: 'width .3s' }} />
            </div>
            <div className="flex items-center gap-2">
              <span className="flex-1">{prog.msg} {prog.bytes ? `· ${MB(prog.bytes)}` : ''}</span>
              <button type="button" onClick={() => ctrl.current?.abort()} className="px-2 py-1 rounded-sm text-[10px] uppercase" style={{ border: '1px solid #ef444488', color: '#ef4444' }}>{t('Cancelar')}</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={start} disabled={est.tooBig} className="w-full flex items-center justify-center gap-2 py-2 mb-3 rounded-sm text-xs uppercase tracking-wider font-bold disabled:opacity-40" style={btn(true)}>
            <Download size={13} /> {t('Guardar esta área')}
          </button>
        )}
        {msg && <p role="status" className="mb-3" style={{ color: '#ffaa00' }}>{msg}</p>}

        {/* Áreas guardadas */}
        <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: '#ffaa00' }}>{t('Áreas guardadas')} ({rep?.areas.length || 0})</p>
        {rep?.areas.length ? (
          <ul className="space-y-1.5 mb-3">
            {rep.areas.map((a) => (
              <li key={a.id} className="flex items-center gap-2 p-2 rounded-sm" style={box}>
                <span className="flex-1 min-w-0">
                  <b className="block truncate">{a.name}{a.done ? '' : ` (${t('incompleta')})`}</b>
                  <span className="opacity-70">{t(OFFLINE_LAYERS[a.layer]?.label || a.layer)} · z{a.minZoom}–{a.maxZoom} · {MB(a.bytes || 0)}{a.dem ? ` · ${t('relevo')}` : ''}{a.graph ? ` · ${t('rotas')}` : ''} · {new Date(a.created).toLocaleDateString('pt-PT')}</span>
                </span>
                <button type="button" onClick={() => onFly?.(a.bbox)} aria-label={t('Ver {n}', { n: a.name })} className="p-1.5 rounded-sm" style={btn(false)}><Eye size={13} /></button>
                <button type="button" disabled={!!prog} onClick={async () => { await deleteArea(a.id); refresh(); }} aria-label={t('Apagar {n}', { n: a.name })} className="p-1.5 rounded-sm disabled:opacity-30" style={{ border: '1px solid #ef444488', color: '#ef4444' }}><Trash2 size={13} /></button>
              </li>
            ))}
          </ul>
        ) : <p className="mb-3 opacity-70">{t('Ainda não guardaste nenhuma área.')}</p>}

        {/* Pacote PMTiles de Portugal */}
        <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: '#ffaa00' }}>{t('Mapa completo de Portugal (pacote PMTiles)')}</p>
        <div className="p-2 rounded-sm mb-1" style={box}>
          {rep?.pack ? (
            <div className="flex items-center gap-2">
              <Package size={14} className="shrink-0" />
              <span className="flex-1 min-w-0"><b className="block truncate">{rep.pack.name}</b><span className="opacity-70">{MB(rep.pack.size)} · z{rep.pack.header.minZoom}–{rep.pack.header.maxZoom} · {rep.pack.header.tileType.toUpperCase()} · {t('em uso offline')}</span></span>
              <button type="button" onClick={async () => { await deletePack(); refresh(); }} aria-label={t('Apagar pacote')} className="p-1.5 rounded-sm" style={{ border: '1px solid #ef444488', color: '#ef4444' }}><Trash2 size={13} /></button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 py-1.5 rounded-sm text-[10px] uppercase tracking-wider cursor-pointer" style={btn(false)}>
              <Package size={13} /> {t('Importar ficheiro .pmtiles')}
              <input type="file" accept=".pmtiles" className="sr-only" onChange={(e) => { onPack(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
          )}
        </div>
        <p className="opacity-60 text-[10px] leading-relaxed">{t('O país inteiro tem demasiados mosaicos para descarregar dos servidores gratuitos (que proíbem descargas em massa). Usa um ficheiro PMTiles raster de Portugal guardado no telemóvel (por exemplo, gerado com a ferramenta pmtiles a partir de um MBTiles): fica guardado na app e o mapa lê-o sem rede quando a zona não está guardada.')}</p>
      </div>
    </div>
  );
}
