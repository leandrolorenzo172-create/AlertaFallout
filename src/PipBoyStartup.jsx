import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function PipBoyStartup({ onComplete }) {
  const [phase, setPhase] = useState('arm-raise');

  useEffect(() => {
    // Play startup sound
    const playStartupSound = () => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Power-on beep
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);

      // Static noise
      setTimeout(() => {
        const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.2, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < buffer.length; i++) {
          data[i] = Math.random() * 0.1 - 0.05;
        }
        const noise = audioContext.createBufferSource();
        const noiseGain = audioContext.createGain();
        noise.buffer = buffer;
        noise.connect(noiseGain);
        noiseGain.connect(audioContext.destination);
        noiseGain.gain.setValueAtTime(0.05, audioContext.currentTime);
        noise.start();
      }, 300);
    };

    // O som pode falhar (browser sem Web Audio); a animação continua na mesma
    try { playStartupSound(); } catch (e) { /* sem som */ }

    // Arm raise phase
    const armTimer = setTimeout(() => {
      setPhase('screen-on');
    }, 1500);

    // Screen turn on
    const screenTimer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => {
      clearTimeout(armTimer);
      clearTimeout(screenTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden" style={{ background: '#000' }}>
      {/* Arm raise animation */}
      {phase === 'arm-raise' && (
        <motion.div
          className="absolute inset-0 flex items-end justify-center"
          initial={{ y: '100%' }}
          animate={{ y: '0%' }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{
            background: 'radial-gradient(ellipse at center bottom, #1a1a1a 0%, #000 70%)',
          }}
        >
          {/* Pip-Boy device silhouette */}
          <motion.div
            className="mb-[10vh]"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            <div 
              className="relative"
              style={{
                width: '80vw',
                maxWidth: '400px',
                height: '60vw',
                maxHeight: '300px',
                background: 'linear-gradient(135deg, #1a1a1a, #0d0d0d)',
                borderRadius: '20px',
                border: '3px solid #333',
                boxShadow: '0 10px 50px rgba(0,0,0,0.8)',
              }}
            >
              {/* Screen area */}
              <div 
                className="absolute"
                style={{
                  top: '15%',
                  left: '10%',
                  right: '10%',
                  bottom: '25%',
                  background: '#000',
                  borderRadius: '8px',
                  border: '2px solid #222',
                }}
              />
              
              {/* Buttons */}
              <div className="absolute bottom-[8%] left-[15%] right-[15%] flex justify-around">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: '#222',
                      border: '1px solid #333',
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Screen turn on */}
      {phase === 'screen-on' && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={{ background: '#000' }}
        >
          {/* CRT turn-on effect */}
          <motion.div
            initial={{ scaleY: 0, scaleX: 0.95 }}
            animate={{ scaleY: 1, scaleX: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full h-full flex items-center justify-center"
            style={{
              background: 'radial-gradient(ellipse at center, #0a0a0a 0%, #000 100%)',
            }}
          >
            {/* Green glow flash */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.5, 2] }}
              transition={{ duration: 0.8 }}
              style={{
                position: 'absolute',
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: '#00ff41',
                filter: 'blur(80px)',
              }}
            />
            
            {/* Static noise */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{ duration: 0.4, times: [0, 0.5, 1] }}
              className="absolute inset-0"
              style={{
                background: `repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  rgba(0, 255, 65, 0.1) 2px,
                  rgba(0, 255, 65, 0.1) 4px
                )`,
              }}
            />
          </motion.div>
        </motion.div>
      )}

      {/* Scanline overlay always on */}
      <div 
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(0,255,65,0.05) 0px, rgba(0,255,65,0.05) 2px, transparent 2px, transparent 4px)',
          opacity: phase === 'screen-on' ? 1 : 0,
        }}
      />
    </div>
  );
}
