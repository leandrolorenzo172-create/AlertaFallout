import React from 'react';

export function Switch({ checked, onCheckedChange, ...props }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      onClick={() => onCheckedChange && onCheckedChange(!checked)}
      className="relative shrink-0 rounded-full transition-colors"
      style={{
        width: 40, height: 22,
        background: checked ? 'rgb(var(--c) / 0.33)' : 'rgb(var(--cd))',
        border: `1px solid ${checked ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.27)'}`,
      }}
      {...props}
    >
      <span
        className="absolute rounded-full transition-all"
        style={{ top: 2, left: checked ? 20 : 2, width: 16, height: 16, background: checked ? 'rgb(var(--c))' : 'rgb(var(--c) / 0.4)' }}
      />
    </button>
  );
}
