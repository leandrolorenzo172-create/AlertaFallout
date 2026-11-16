import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

export default function PullToRefresh({ children, onRefresh }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const y = useMotionValue(0);
  const startY = useRef(0);
  const containerRef = useRef(null);
  
  const pullProgress = useTransform(y, [0, 80], [0, 1]);
  const iconRotation = useTransform(y, [0, 80], [0, 360]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e) => {
      if (container.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e) => {
      if (!isPulling || container.scrollTop > 0) return;
      
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;
      
      if (diff > 0) {
        e.preventDefault();
        y.set(Math.min(diff * 0.5, 100));
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling) return;
      
      setIsPulling(false);
      
      if (y.get() >= 80) {
        setIsRefreshing(true);
        await onRefresh();
        setIsRefreshing(false);
      }
      
      y.set(0);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, y, onRefresh]);

  return (
    <div ref={containerRef} className="relative h-full overflow-y-auto">
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-50"
        style={{ 
          y,
          opacity: useTransform(y, [0, 40], [0, 1]),
        }}
      >
        <div 
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ 
            background: '#001a00cc', 
            border: '1px solid #00ff4133',
            backdropFilter: 'blur(10px)',
          }}
        >
          <motion.div style={{ rotate: isRefreshing ? 360 : iconRotation }}>
            <RefreshCw 
              size={16} 
              style={{ color: '#00ff41' }}
              className={isRefreshing ? 'animate-spin' : ''}
            />
          </motion.div>
          <span className="text-xs uppercase tracking-wider" style={{ color: '#00ff41' }}>
            {isRefreshing ? 'A atualizar...' : 'Puxar para atualizar'}
          </span>
        </div>
      </motion.div>
      
      {children}
    </div>
  );
}

