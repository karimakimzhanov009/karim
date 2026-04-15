import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from './types';
import { getUserByUsername, seedAdmin } from './db';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<string | null>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            await seedAdmin();
            // Restore session
            const saved = localStorage.getItem('ithub_session');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    const fresh = await getUserByUsername(parsed.username);
                    if (fresh) setUser(fresh);
                } catch { /* ignore */ }
            }
            setLoading(false);
        };
        init();
    }, []);

    const login = async (username: string, password: string): Promise<string | null> => {
        const found = await getUserByUsername(username);
        if (!found) return 'Пользователь не найден';
        if (found.password !== password) return 'Неверный пароль';
        setUser(found);
        localStorage.setItem('ithub_session', JSON.stringify({ username }));
        return null;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('ithub_session');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
