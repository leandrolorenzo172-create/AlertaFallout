import React, { useEffect, useRef } from 'react';
import { mountRadio } from '../radio/radioTuner';
import '../radio/radioTuner.css';

// Sintonizador analógico com as emissoras portuguesas pré-configuradas.
export default function RadioTab() {
  const ref = useRef(null);

  useEffect(() => {
    const destroy = mountRadio(ref.current);
    return destroy;
  }, []);

  return <div ref={ref} />;
}
