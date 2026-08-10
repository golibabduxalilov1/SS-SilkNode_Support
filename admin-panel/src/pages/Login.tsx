import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { IconLock } from '../components/icons';

/** POST /api/v1/admin/auth/login — bo'lim 5.3, Mini App'dan mustaqil kirish. */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setError("Login yoki parol noto'g'ri.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <span className="login-mark">S</span>
        <h1>Silknode Support</h1>
        <p className="subtitle">Web Admin Panel</p>

        <label>
          Login
          <input value={loginValue} onChange={(e) => setLoginValue(e.target.value)} required />
        </label>

        <label>
          Parol
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && (
          <p className="form-error">
            <IconLock width={14} height={14} />
            {error}
          </p>
        )}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Kirilmoqda...' : 'Kirish'}
        </button>
      </form>
    </div>
  );
}
