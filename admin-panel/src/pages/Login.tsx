import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  IconAlert,
  IconClock,
  IconEye,
  IconEyeOff,
  IconGrid,
  IconLock,
  IconSpinner,
  IconUser,
  IconUsers,
} from '../components/icons';

/** POST /api/v1/admin/auth/login — bo'lim 5.3, Mini App'dan mustaqil kirish. */
export function LoginPage() {
  const { login } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const FEATURES = [
    { icon: IconGrid, label: t('login.feature1') },
    { icon: IconUsers, label: t('login.feature2') },
    { icon: IconClock, label: t('login.feature3') },
  ];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await api.post('/admin/auth/login', {
        login: loginValue,
        password,
      });
      const { accessToken, user } = res.data.data;
      login(accessToken, user);
      navigate('/dashboard', { replace: true });
    } catch {
      setError(t('login.invalidCredentials'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <button
        type="button"
        className="lang-toggle login-lang-toggle"
        onClick={toggleLanguage}
        aria-label={t('appShell.switchLanguage')}
        title={t('appShell.switchLanguage')}
      >
        {language === 'uz' ? 'UZ' : 'RU'}
      </button>
      <aside className="login-showcase">
        <div className="login-showcase-glow" />
        <div className="login-showcase-content">
          <div className="login-showcase-brand">
            <span className="login-mark">
              <img src="/logo.png" alt="Silknode" />
            </span>
            <h2>Silknode Support</h2>
          </div>
          <p>{t('login.tagline')}</p>
          <ul className="login-showcase-features">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label}>
                <span className="login-showcase-feature-icon">
                  <Icon width={16} height={16} />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
        <p className="login-showcase-footnote">© {new Date().getFullYear()} Silknode Support</p>
      </aside>

      <main className="login-panel">
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <span className="login-mark login-mark-mobile">
            <img src="/logo.png" alt="Silknode" />
          </span>
          <div className="login-form-heading">
            <h1>{t('login.welcome')}</h1>
            <p className="subtitle">{t('login.subtitle')}</p>
          </div>

          <label className="login-field">
            {t('login.login')}
            <div className="login-input-wrap">
              <IconUser className="login-input-icon" width={17} height={17} />
              <input
                value={loginValue}
                onChange={(e) => setLoginValue(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </div>
          </label>

          <label className="login-field login-field-password">
            {t('login.password')}
            <div className="login-input-wrap">
              <IconLock className="login-input-icon" width={17} height={17} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-input-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                tabIndex={-1}
              >
                {showPassword ? <IconEyeOff width={17} height={17} /> : <IconEye width={17} height={17} />}
              </button>
            </div>
          </label>

          {error && (
            <p className="form-error" role="alert">
              <IconAlert width={15} height={15} />
              {error}
            </p>
          )}

          <button type="submit" className="login-submit" disabled={isSubmitting}>
            {isSubmitting && <IconSpinner className="login-submit-spinner" width={16} height={16} />}
            {isSubmitting ? t('login.signingIn') : t('login.signIn')}
          </button>
        </form>
      </main>
    </div>
  );
}
