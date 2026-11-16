import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function LoadingScreen({ message = 'A CARREGAR DADOS...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 size={32} style={{ color: '#00ff41' }} />
      </motion.div>
      
      <motion.p
        className="mt-4 text-xs uppercase tracking-widest"
        style={{ color: '#00ff4188' }}
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {message}
      </motion.p>
      
      <div className="mt-4 w-48 h-1 rounded overflow-hidden" style={{ background: '#001a00' }}>
        <motion.div
          className="h-full"
          style={{ background: '#00ff41' }}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}
