'use client';

import React from 'react';
import { THEMES, type ThemeId } from '@/lib/themes/themes';
import { useTheme } from '@/lib/themes/ThemeContext';

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--theme-border)' }}>
      <p className="text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>Theme</p>
      <div className="grid grid-cols-3 gap-2">
        {THEMES.map(t => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id as ThemeId)}
            title={t.name}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-xs font-medium ${
              theme === t.id
                ? 'border-[var(--theme-accent)] ring-1 ring-[var(--theme-accent)]'
                : 'border-[var(--theme-border)] hover:border-[var(--theme-border-strong)]'
            }`}
            style={{ color: 'var(--theme-text)' }}
          >
            {/* Color preview swatch */}
            <div
              className="w-full h-8 rounded-md flex items-center justify-center gap-1 overflow-hidden"
              style={{ backgroundColor: t.preview[0] }}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: t.preview[1] }}
              />
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: t.preview[2] }}
              />
            </div>
            <span>{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
