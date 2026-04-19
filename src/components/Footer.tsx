'use client';
import { Github } from 'lucide-react';

import pkg from '../../package.json';

const GITHUB_URL =
  process.env.NEXT_PUBLIC_GITHUB_URL?.trim() || 'https://github.com/x3kim/J1.Notes';
const VERSION = `v${pkg.version}`;

export default function Footer() {
  return (
    <footer
      className="h-14 flex items-center justify-end px-6 border-t shrink-0"
      style={{ borderColor: 'var(--theme-border)' }}
    >
      <div className="flex items-center gap-3">
        <span
          className="text-xs px-2 py-0.5 rounded-full border font-mono"
          style={{
            color: 'var(--theme-text-muted)',
            borderColor: 'var(--theme-border)',
          }}
        >
          {VERSION}
        </span>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
          style={{ color: 'var(--theme-text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          title="View on GitHub"
        >
          <Github size={18} />
          <span className="text-sm font-medium">GitHub</span>
        </a>
      </div>
    </footer>
  );
}
