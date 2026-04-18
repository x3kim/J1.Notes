'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

type Status = 'validating' | 'invalid' | 'valid' | 'submitting' | 'success' | 'error';

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center p-4"
          style={{ backgroundColor: 'var(--theme-bg)' }}
        >
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--theme-text-muted)' }} />
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const { t } = useTranslation('auth');
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<Status>('validating');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setError(t('reset.invalidToken', 'This reset link is invalid.'));
      return;
    }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        if (d.valid) {
          setStatus('valid');
        } else {
          setStatus('invalid');
          setError(t('reset.expiredOrInvalid', 'This reset link has expired or is invalid.'));
        }
      })
      .catch(() => {
        setStatus('invalid');
        setError(t('reset.serverError', 'Unable to validate reset link. Please try again later.'));
      });
  }, [token, t]);

  // After success, redirect to login after 2 seconds
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => router.push('/login'), 2000);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  const validate = (): string => {
    if (password.length < 8) return t('reset.tooShort', 'Password must be at least 8 characters');
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return t('reset.complexity', 'Password must contain letters and numbers');
    }
    if (password !== confirm) return t('reset.mismatch', 'Passwords do not match');
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setStatus('submitting');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStatus('success');
      } else if (data.error === 'invalid_or_expired') {
        setStatus('invalid');
        setError(t('reset.expiredOrInvalid', 'This reset link has expired or is invalid.'));
      } else if (data.error === 'weak_password') {
        setStatus('valid');
        setError(data.message || t('reset.tooWeak', 'Password is too weak.'));
      } else {
        setStatus('valid');
        setError(t('reset.serverError', 'Something went wrong. Please try again.'));
      }
    } catch {
      setStatus('valid');
      setError(t('reset.serverError', 'Something went wrong. Please try again.'));
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--theme-bg)' }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-black text-3xl mx-auto mb-4"
            style={{ backgroundColor: 'var(--theme-accent)' }}
          >
            N
          </div>
          <h1 className="text-2xl font-medium" style={{ color: 'var(--theme-text)' }}>
            {t('reset.title', 'Reset password')}
          </h1>
        </div>

        {status === 'validating' && (
          <div className="flex items-center justify-center gap-2 py-8" style={{ color: 'var(--theme-text-muted)' }}>
            <Loader2 size={20} className="animate-spin" />
            <span>{t('reset.validating', 'Validating link...')}</span>
          </div>
        )}

        {status === 'invalid' && (
          <div
            className="rounded-xl p-4 text-center"
            style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-text)' }}
          >
            <AlertCircle size={40} className="mx-auto mb-3 text-red-400" />
            <p className="mb-4">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="font-semibold py-2 px-4 rounded-xl text-black"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              {t('reset.backToLogin', 'Back to login')}
            </button>
          </div>
        )}

        {status === 'success' && (
          <div
            className="rounded-xl p-4 text-center"
            style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-text)' }}
          >
            <CheckCircle2 size={40} className="mx-auto mb-3 text-green-400" />
            <p className="mb-2 font-medium">
              {t('reset.success', 'Password reset!')}
            </p>
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
              {t('reset.redirecting', 'Redirecting to login...')}
            </p>
          </div>
        )}

        {(status === 'valid' || status === 'submitting') && (
          <form onSubmit={handleSubmit}>
            <div className="relative mb-3">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('reset.newPassword', 'New password')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-xl px-4 py-4 pr-12 outline-none placeholder-gray-500"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  color: 'var(--theme-text)',
                  border: '2px solid transparent',
                }}
                autoFocus
                disabled={status === 'submitting'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--theme-text-muted)' }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="mb-3">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('reset.confirmPassword', 'Confirm password')}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full rounded-xl px-4 py-4 outline-none placeholder-gray-500"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  color: 'var(--theme-text)',
                  border: '2px solid transparent',
                }}
                disabled={status === 'submitting'}
              />
            </div>

            <p className="text-xs mb-3" style={{ color: 'var(--theme-text-muted)' }}>
              {t('reset.requirements', 'At least 8 characters, with letters and numbers.')}
            </p>

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            <button
              type="submit"
              disabled={status === 'submitting' || !password || !confirm}
              className="w-full font-semibold py-4 rounded-xl transition-colors disabled:opacity-50 text-black"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              {status === 'submitting'
                ? t('reset.submitting', 'Resetting...')
                : t('reset.submit', 'Reset password')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
