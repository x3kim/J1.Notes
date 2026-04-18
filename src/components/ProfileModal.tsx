'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { X, Camera, Loader2, User } from 'lucide-react';

interface ProfileModalProps {
  onClose: () => void;
  onProfileUpdated: (username: string | null, avatar: string | null) => void;
}

export default function ProfileModal({ onClose, onProfileUpdated }: ProfileModalProps) {
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        setUsername(d.username ?? '');
        setAvatar(d.avatar ?? null);
      });
  }, []);

  const validateUsername = (value: string) => {
    if (value.length === 0) return '';
    if (value.length < 3) return 'At least 3 characters required';
    if (value.length > 20) return 'Maximum 20 characters allowed';
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Only letters, numbers, and underscores';
    return '';
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUsername(val);
    setUsernameError(validateUsername(val));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only PNG, JPG, and WebP images are allowed');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must not exceed 2 MB');
      return;
    }

    setUploading(true);
    try {
      // Delete old avatar if it exists
      if (avatar && avatar.startsWith('/avatars/')) {
        await fetch(`/api/avatar?file=${encodeURIComponent(avatar)}`, { method: 'DELETE' });
      }

      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/avatar', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? 'Upload failed');
        return;
      }
      const { url } = await res.json();
      setAvatar(url);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (avatar && avatar.startsWith('/avatars/')) {
      await fetch(`/api/avatar?file=${encodeURIComponent(avatar)}`, { method: 'DELETE' });
    }
    setAvatar(null);
  };

  const handleSave = async () => {
    const err = validateUsername(username);
    if (err) { setUsernameError(err); return; }

    setSaving(true);
    try {
      const body: Record<string, unknown> = { avatar };
      if (username.trim().length >= 3) body.username = username.trim();

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? 'Failed to save');
        return;
      }
      const data = await res.json();
      toast.success('Profile saved');
      onProfileUpdated(data.username, data.avatar);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // Generate initials avatar
  const initials = username.trim()
    ? username.trim().slice(0, 2).toUpperCase()
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6"
        style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-text)' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full transition-colors"
          style={{ color: 'var(--theme-text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-semibold mb-6">Profile</h2>

        {/* Avatar section */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="relative group">
            {avatar ? (
              <img
                src={avatar}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-2"
                style={{ borderColor: 'var(--theme-accent)' }}
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold select-none"
                style={{ backgroundColor: 'var(--theme-accent)', color: '#000' }}
              >
                {initials ?? <User size={36} />}
              </div>
            )}

            {/* Upload overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
              title="Upload avatar"
            >
              {uploading
                ? <Loader2 size={28} className="text-white animate-spin" />
                : <Camera size={28} className="text-white" />}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleAvatarUpload}
          />

          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-sm px-3 py-1 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--theme-accent)', color: '#000' }}
            >
              {uploading ? 'Uploading…' : 'Upload photo'}
            </button>
            {avatar && (
              <button
                onClick={handleRemoveAvatar}
                className="text-sm px-3 py-1 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'var(--theme-bg-secondary)',
                  color: 'var(--theme-text-muted)',
                  border: '1px solid var(--theme-border)',
                }}
              >
                Remove
              </button>
            )}
          </div>
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            PNG, JPG or WebP · max 2 MB
          </p>
        </div>

        {/* Username section */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={handleUsernameChange}
            placeholder="e.g. my_name"
            maxLength={20}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              backgroundColor: 'var(--theme-bg-secondary)',
              color: 'var(--theme-text)',
              border: `1px solid ${usernameError ? '#ef4444' : 'var(--theme-border)'}`,
            }}
          />
          {usernameError && (
            <p className="text-xs mt-1 text-red-500">{usernameError}</p>
          )}
          <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>
            3–20 characters · letters, numbers, underscores
          </p>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || !!usernameError || uploading}
          className="w-full py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--theme-accent)', color: '#000' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
