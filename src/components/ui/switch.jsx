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
        background: checked ? '#00ff4155' : '#001a00',
        border: `1px solid ${checked ? '#00ff41' : '#00ff4144'}`,
      }}
      {...props}
    >
      <span
        className="absolute rounded-full transition-all"
        style={{ top: 2, left: checked ? 20 : 2, width: 16, height: 16, background: checked ? '#00ff41' : '#00ff4166' }}
      />
    </button>
  );
}
