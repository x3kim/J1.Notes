'use client';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Delete, X, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { t } = useTranslation('auth');
  const [authType, setAuthType] = useState<'password' | 'pin'>('password');
  const [pinLength, setPinLength] = useState(6);
  const [input, setInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showResetInfo, setShowResetInfo] = useState(false);

  useEffect(() => {
    fetch('/api/settings/auth')
      .then(r => r.json())
      .then(d => {
        setAuthType(d.auth_type || 'password');
        setPinLength(d.pin_length || 6);
      });
  }, []);

  const handleLogin = async (pwd: string) => {
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd }),
    });
    if (res.ok) {
      window.location.href = '/';
    } else {
      setError(authType === 'pin' ? t('login.wrongPin') : t('login.wrongPassword'));
      setInput('');
    }
    setLoading(false);
  };

  const handlePinPress = (digit: string) => {
    if (input.length >= pinLength) return;
    const newPin = input + digit;
    setInput(newPin);
    if (newPin.length === pinLength) handleLogin(newPin);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--theme-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-black text-3xl mx-auto mb-4" style={{ backgroundColor: 'var(--theme-accent)' }}>N</div>
          <h1 className="text-2xl font-medium" style={{ color: 'var(--theme-text)' }}>{t('login.title')}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>{authType === 'pin' ? t('login.pleaseEnterPin') : t('login.pleaseLogin')}</p>
        </div>

        {authType === 'pin' ? (
          <div>
            {/* PIN-Dots — dynamisch je nach PIN-Länge */}
            <div className="flex justify-center gap-3 mb-8">
              {Array.from({ length: pinLength }).map((_, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full border-2 transition-colors"
                  style={i < input.length
                    ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }
                    : { borderColor: 'var(--theme-border-strong)' }}
                />
              ))}
            </div>
            {/* PIN pad */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                <button
                  key={d}
                  onClick={() => handlePinPress(d)}
                  disabled={loading}
                  className="h-16 rounded-2xl text-2xl font-medium transition-colors"
                  style={{ backgroundColor: 'var(--theme-hover)', color: 'var(--theme-text)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-bg-tertiary)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
                >
                  {d}
                </button>
              ))}
              <div />
              <button
                onClick={() => handlePinPress('0')}
                disabled={loading}
                className="h-16 rounded-2xl text-2xl font-medium transition-colors"
                style={{ backgroundColor: 'var(--theme-hover)', color: 'var(--theme-text)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-bg-tertiary)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
              >
                0
              </button>
              <button
                onClick={() => setInput(input.slice(0, -1))}
                className="h-16 rounded-2xl flex items-center justify-center transition-colors"
                style={{ color: 'var(--theme-text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Delete size={20} />
              </button>
            </div>
            {error && <p className="text-red-400 text-center text-sm mt-2">{error}</p>}
            <button
              onClick={() => setShowResetInfo(!showResetInfo)}
              className="w-full text-center text-gray-500 hover:text-gray-300 text-sm mt-4 transition-colors"
            >
              {t('login.forgotPin')}
            </button>
            {showResetInfo && (
              <div className="mt-3 p-3 bg-white/5 rounded-xl text-sm text-gray-400 text-center">
                {t('login.resetHint')}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="relative mb-4">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('login.passwordPlaceholder')}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin(input)}
                className="w-full rounded-xl px-4 py-4 pr-12 outline-none placeholder-gray-500"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  color: 'var(--theme-text)',
                  border: '2px solid transparent',
                }}
                autoFocus
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <button
              onClick={() => handleLogin(input)}
              disabled={loading || !input}
              className="w-full font-semibold py-4 rounded-xl transition-colors disabled:opacity-50 text-black"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              {loading ? t('login.verifying') : t('login.unlock')}
            </button>
            <div className="text-center mt-4 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-sm underline transition-colors"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                {t('login.forgotPassword', 'Forgot password?')}
              </button>
              <button
                type="button"
                onClick={() => setShowResetInfo(!showResetInfo)}
                className="text-xs transition-colors"
                style={{ color: 'var(--theme-text-subtle)' }}
              >
                {showResetInfo ? '×' : '?'}
              </button>
              {showResetInfo && (
                <div
                  className="mt-1 p-3 rounded-xl text-sm text-center"
                  style={{ backgroundColor: 'var(--theme-hover)', color: 'var(--theme-text-muted)' }}
                >
                  {t('login.resetHint')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showForgotModal && (
        <ForgotPasswordModal onClose={() => setShowForgotModal(false)} />
      )}
    </div>
  );
}

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
    } catch {
      // Intentional: we show the generic success UI regardless of failure
      // to avoid leaking whether the email exists.
    }
    setSent(true);
    setSubmitting(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6"
        style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-text)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full transition-colors"
          style={{ color: 'var(--theme-text-muted)' }}
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <h2 className="text-lg font-semibold mb-2">
          {t('forgot.title', 'Forgot password')}
        </h2>

        {sent ? (
          <div>
            <p className="text-sm mb-4" style={{ color: 'var(--theme-text-muted)' }}>
              {t('forgot.checkEmail', 'If this email is registered for password recovery, a reset link has been sent. Please check your inbox.')}
            </p>
            <button
              onClick={onClose}
              className="w-full font-semibold py-3 rounded-xl text-black"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              {t('forgot.ok', 'OK')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="text-sm mb-4" style={{ color: 'var(--theme-text-muted)' }}>
              {t('forgot.prompt', 'Enter your recovery email to receive a reset link.')}
            </p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('forgot.emailPlaceholder', 'you@example.com')}
              className="w-full rounded-xl px-4 py-3 mb-3 outline-none placeholder-gray-500"
              style={{
                backgroundColor: 'var(--theme-input-bg)',
                color: 'var(--theme-text)',
                border: '2px solid transparent',
              }}
              autoFocus
              required
            />
            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className="w-full font-semibold py-3 rounded-xl text-black flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting
                ? t('forgot.sending', 'Sending...')
                : t('forgot.sendLink', 'Send reset link')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
