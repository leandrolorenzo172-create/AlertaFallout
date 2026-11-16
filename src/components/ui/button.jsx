import React from 'react';

export function Button({ className = '', children, ...props }) {
  return (
    <button className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-sm text-xs uppercase tracking-wider disabled:opacity-50 ${className}`} {...props}>
      {children}
    </button>
  );
}
