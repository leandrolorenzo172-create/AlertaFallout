// Ferramentas do menu ≡ na aba RÁDIO: comando remoto do sintonizador (src/radio/radioTuner.js) e gravação (REC).
// O sintonizador fala por eventos globais (corre também no rádio autónomo, sem imports):
//   'steeldeck:radio-cmd' -> comandos  ·  'pb-radio-state' -> estado (ligado, emissora)
import { useSyncExternalStore } from 'react';
import { importFile } from '@/lib/kb';

let state = { isRadioOn: false, station: '', freq: null, band: 'FM', isRecording: false, recSource: null, recStart: 0, recMsg: '' };
const listeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
export const getRadioRemote = () => state;
export const useRadioRemote = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getRadioRemote);
if (typeof window !== 'undefined') {
  window.addEventListener('pb-radio-state', (e) => { const d = e.detail || {}; set({ isRadioOn: !!d.on, station: d.station || '', freq: d.freq, band: d.band || 'FM' }); });
}

const send = (detail) => window.dispatchEvent(new CustomEvent('steeldeck:radio-cmd', { detail }));
// ⏻ liga/desliga (resposta imediata na UI; o sintonizador confirma o estado real)
export const onToggleRadio = () => { set({ isRadioOn: !state.isRadioOn }); send('toggle'); };
export const onNextStation = () => send('next');   // >>| emissora seguinte
export const onPrevStation = () => send('prev');   // |<< emissora anterior
export const requestRadioState = () => send('state');

// ---------- ● REC ----------
// 1.º tenta gravar o próprio fluxo da emissora; se a emissora não deixar (som mudo), grava pelo microfone.
// O ficheiro fica em FICHEIROS (base de conhecimento) e é descarregado.
// MP3: os browsers não gravam MP3 de origem. A conversão precisa de um codificador incluído na app
// (ex.: @breezystack/lamejs) — ainda não instalado; até lá grava em WebM/Ogg (ou M4A no Safari).
let rec = null; // { recorder, chunks, stream, stopTracks }
const pickMime = () => ['audio/mpeg', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || '';
const extOf = (mime) => (/mpeg/.test(mime) ? 'mp3' : /ogg/.test(mime) ? 'ogg' : /mp4/.test(mime) ? 'm4a' : 'webm');

function radioStream() {
  return new Promise((resolve) => {
    let done = false;
    send({ cmd: 'capture', reply: (s, station) => { done = true; resolve({ stream: s, station }); } });
    setTimeout(() => { if (!done) resolve({ stream: null, station: '' }); }, 300);
  });
}
// verifica se o fluxo tem som (emissoras sem autorização dão silêncio)
async function hasSound(stream) {
  try {
    if (!stream || !stream.getAudioTracks().length) return false;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const an = ctx.createAnalyser(); ctx.createMediaStreamSource(stream).connect(an);
    const buf = new Uint8Array(an.fftSize); let peak = 0;
    for (let i = 0; i < 8; i++) { await new Promise((r) => setTimeout(r, 100)); an.getByteTimeDomainData(buf); for (const v of buf) peak = Math.max(peak, Math.abs(v - 128)); }
    ctx.close(); return peak > 2;
  } catch { return false; }
}

export async function onToggleRecordMp3() {
  if (rec) { rec.recorder.stop(); return; }
  if (!window.MediaRecorder) { set({ recMsg: 'Este browser não grava áudio.' }); return; }
  set({ recMsg: 'A preparar a gravação…' });
  let { stream, station } = state.isRadioOn ? await radioStream() : { stream: null, station: '' };
  let source = 'radio';
  if (!(await hasSound(stream))) {
    source = 'mic';
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } }); }
    catch (e) { set({ recMsg: e.name === 'NotAllowedError' ? 'O microfone está bloqueado para esta app.' : 'Não foi possível abrir o microfone.' }); return; }
  }
  const mime = pickMime();
  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  recorder.onstop = async () => {
    if (source === 'mic') stream.getTracks().forEach((tk) => tk.stop());
    const type = recorder.mimeType || mime || 'audio/webm';
    const d = new Date(); const p2 = (n) => String(n).padStart(2, '0');
    const name = `Gravação ${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()} ${p2(d.getHours())}h${p2(d.getMinutes())} - ${source === 'radio' ? (station || 'Rádio') : 'Microfone'}.${extOf(type)}`;
    const file = new File(chunks, name.replace(/[\\/:*?"<>|]+/g, ''), { type, lastModified: Date.now() });
    rec = null;
    set({ isRecording: false, recSource: null, recStart: 0 });
    // descarga + cópia em FICHEIROS
    try { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); } catch { /* sem descarga */ }
    const r = await importFile(file).catch(() => ({ status: 'erro' }));
    set({ recMsg: r.status === 'ok' ? `✔ Gravação guardada em FICHEIROS: ${file.name}` : `Gravação descarregada: ${file.name}` });
  };
  recorder.start(1000);
  rec = { recorder };
  set({ isRecording: true, recSource: source, recStart: Date.now(), recMsg: source === 'radio' ? `● A gravar ${station || 'o rádio'}` : (state.isRadioOn ? '● A gravar pelo microfone (esta emissora não deixa gravar o fluxo diretamente)' : '● A gravar pelo microfone') });
}
