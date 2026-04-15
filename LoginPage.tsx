import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { LogIn, Eye, EyeOff, GraduationCap } from 'lucide-react';

const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!username.trim() || !password.trim()) {
            setError('Заполните все поля');
            return;
        }
        setIsLoading(true);
        // Simulate small delay for feel
        setTimeout(() => {
            const err = login(username.trim(), password);
            if (err) setError(err);
            setIsLoading(false);
        }, 400);
    };

    return (
        <div className="login-page">
            <div className="login-bg-pattern" />
            <div className="login-card">
                <div className="login-logo">
                    <div className="login-logo-circle" style={{ overflow: 'hidden' }}>
                        <img src="/image copy.png" alt="itHUB Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                </div>
                <h1 className="login-title">AEC</h1>
                <p className="login-subtitle">Экзаменационная платформа</p>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label className="form-label">Логин</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Введите логин"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Пароль</label>
                        <div className="password-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                placeholder="Введите пароль"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="login-error">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-full"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="btn-loading">Вход...</span>
                        ) : (
                            <>
                                <LogIn size={18} />
                                <span>Войти</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="login-hint">
                    <p>Первый вход: <strong>admin</strong> / <strong>admin123</strong></p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
