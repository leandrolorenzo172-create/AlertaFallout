// "Voltar" do Android/browser fecha o painel aberto em vez de sair do separador.
// Ao abrir, junta uma entrada ao histórico (mesmo endereço). O botão voltar retira-a e fecha o painel;
// fechar pelo botão ✕ retira-a também, para o histórico ficar como estava.
import { useEffect, useRef } from 'react';

export function useBackClose(open, onClose, id = 'panel') {
  const pushed = useRef(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    window.history.pushState({ ...(window.history.state || {}), sdPanel: id }, '');
    pushed.current = true;
    const onPop = () => { if (pushed.current) { pushed.current = false; closeRef.current(); } };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // fechado sem o botão voltar: retira a entrada que juntámos (sem mudar de separador)
      if (pushed.current && window.history.state?.sdPanel === id) { pushed.current = false; window.history.back(); }
    };
  }, [open, id]);
}
