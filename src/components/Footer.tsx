'use client';
import { Github } from 'lucide-react';

export default function Footer() {
  const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL;
  const isGithubUrlAvailable = githubUrl && githubUrl.trim() !== '';

  return (
    <footer
      className="h-14 flex items-center justify-between px-6 border-t shrink-0"
      style={{ borderColor: 'var(--theme-border)' }}
    >
      <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>v1.0.3</span>
      <div className="flex items-center gap-2">
        {isGithubUrlAvailable ? (
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
            style={{ color: 'var(--theme-text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            title="View on GitHub"
          >
            <Github size={18} />
            <span className="text-sm font-medium">View on GitHub</span>
          </a>
        ) : (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-not-allowed opacity-50"
            style={{ color: 'var(--theme-text-muted)' }}
            title="GitHub Repository (coming soon)"
          >
            <Github size={18} />
            <span className="text-sm font-medium">View on GitHub</span>
          </div>
        )}
      </div>
    </footer>
  );
}
