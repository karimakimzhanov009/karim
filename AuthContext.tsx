import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from './types';
import { getUserByUsername, seedAdmin } from './db';

interface AuthContextType {
    user: User | null;
    login: (username: string, password: string) => string | null;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        seedAdmin();
        // Restore session
        const saved = localStorage.getItem('ithub_session');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const fresh = getUserByUsername(parsed.username);
                if (fresh) setUser(fresh);
            } catch { /* ignore */ }
        }
    }, []);

    const login = (username: string, password: string): string | null => {
        const found = getUserByUsername(username);
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
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
