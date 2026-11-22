import React, { useEffect, useRef } from 'react';
import { mountVinylPlayer } from '../music/vinylPlayer';
import '../music/vinylPlayer.css';

// Leitor de vinil offline: toca ficheiros de áudio do próprio dispositivo.
// O separador fica montado ao mudar de separador (App.jsx), por isso a música continua a tocar até ser parada.
// Rádio e música não tocam ao mesmo tempo: quando um começa, o outro pára (evento pb-audio-start).
export default function MusicTab() {
  const ref = useRef(null);

  useEffect(() => {
    const destroy = mountVinylPlayer(ref.current);
    return destroy;
  }, []);

  return <div ref={ref} />;
}
