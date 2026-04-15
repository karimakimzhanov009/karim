import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { User, Quiz, StudentResult } from './types';
import { getTeachers, addUser, deleteUser, getUsers, getQuizzes, getResults, getUserById, deleteQuiz } from './db';
import { LogOut, UserPlus, Trash2, Users, BookOpen, BarChart3, Shield, X, GraduationCap, Clock, Award } from 'lucide-react';

type AdminTab = 'teachers' | 'students' | 'exams';

const AdminDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [tab, setTab] = useState<AdminTab>('teachers');
    const [teachers, setTeachers] = useState<User[]>([]);
    const [allStudents, setAllStudents] = useState<User[]>([]);
    const [allQuizzes, setAllQuizzes] = useState<Quiz[]>([]);
    const [allResults, setAllResults] = useState<StudentResult[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ username: '', password: '', fullName: '', role: 'teacher' as Role });
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({ teachers: 0, students: 0, quizzes: 0, avgScore: 0 });

    const refresh = () => {
        const users = getUsers();
        const quizzes = getQuizzes();
        const results = getResults();
        const teachersList = users.filter(u => u.role === 'teacher' || u.role === 'deputy');
        const studentsList = users.filter(u => u.role === 'student');

        setTeachers(teachersList);
        setAllStudents(studentsList);
        setAllQuizzes(quizzes);
        setAllResults(results);

        const avg = results.length > 0
            ? Math.round(results.reduce((s, r) => s + (r.score / r.maxScore) * 100, 0) / results.length)
            : 0;
        setStats({
            teachers: teachersList.length,
            students: studentsList.length,
            quizzes: quizzes.length,
            avgScore: avg,
        });
    };

    useEffect(() => { refresh(); }, []);

    const handleAddTeacher = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!form.username.trim() || !form.password.trim() || !form.fullName.trim()) {
            setError('Заполните все поля');
            return;
        }
        try {
            addUser({
                id: crypto.randomUUID(),
                username: form.username.trim(),
                password: form.password,
                role: form.role,
                fullName: form.fullName.trim(),
                createdBy: user!.id,
                createdAt: new Date().toISOString(),
            });
            setForm({ username: '', password: '', fullName: '', role: 'teacher' });
            setShowForm(false);
            refresh();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDeleteTeacher = (id: string) => {
        if (confirm('Удалить учителя? Все его ученики и экзамены тоже будут удалены.')) {
            deleteUser(id);
            refresh();
        }
    };

    const handleDeleteStudent = (id: string) => {
        if (confirm('Удалить ученика?')) {
            deleteUser(id);
            refresh();
        }
    };

    const handleDeleteQuiz = (id: string) => {
        if (confirm('Удалить экзамен и все его результаты?')) {
            deleteQuiz(id);
            refresh();
        }
    };

    const getTeacherName = (id?: string) => {
        if (!id) return '—';
        const t = getUserById(id);
        return t ? t.fullName : '—';
    };

    const getResultsCount = (quizId: string) => allResults.filter(r => r.quizId === quizId).length;

    return (
        <div className="dashboard">
            {/* Header */}
            <header className="dashboard-header">
                <div className="dashboard-header-left">
                    <div className="dashboard-avatar admin-avatar">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h1 className="dashboard-title">Панель администратора</h1>
                        <p className="dashboard-user">{user?.fullName}</p>
                    </div>
                </div>
                <button className="btn btn-ghost" onClick={logout}>
                    <LogOut size={18} />
                    <span>Выход</span>
                </button>
            </header>

            {/* Stats — clickable cards that switch tabs */}
            <div className="stats-grid">
                <div className="stat-card stat-purple" onClick={() => setTab('teachers')} style={{ cursor: 'pointer', outline: tab === 'teachers' ? '2px solid var(--primary)' : 'none' }}>
                    <Users size={24} />
                    <div className="stat-value">{stats.teachers}</div>
                    <div className="stat-label">Учителей</div>
                </div>
                <div className="stat-card stat-blue" onClick={() => setTab('students')} style={{ cursor: 'pointer', outline: tab === 'students' ? '2px solid var(--primary)' : 'none' }}>
                    <GraduationCap size={24} />
                    <div className="stat-value">{stats.students}</div>
                    <div className="stat-label">Учеников</div>
                </div>
                <div className="stat-card stat-green" onClick={() => setTab('exams')} style={{ cursor: 'pointer', outline: tab === 'exams' ? '2px solid var(--primary)' : 'none' }}>
                    <BookOpen size={24} />
                    <div className="stat-value">{stats.quizzes}</div>
                    <div className="stat-label">Экзаменов</div>
                </div>
                <div className="stat-card stat-orange" style={{ cursor: 'default' }}>
                    <BarChart3 size={24} />
                    <div className="stat-value">{stats.avgScore}%</div>
                    <div className="stat-label">Средний балл</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab ${tab === 'teachers' ? 'tab-active' : ''}`} onClick={() => setTab('teachers')}>
                    <Users size={16} /><span>Учителя</span>
                </button>
                <button className={`tab ${tab === 'students' ? 'tab-active' : ''}`} onClick={() => setTab('students')}>
                    <GraduationCap size={16} /><span>Ученики</span>
                </button>
                <button className={`tab ${tab === 'exams' ? 'tab-active' : ''}`} onClick={() => setTab('exams')}>
                    <BookOpen size={16} /><span>Экзамены</span>
                </button>
            </div>

            {/* ─── Teachers Tab ─── */}
            {tab === 'teachers' && (
                <div className="section-card">
                    <div className="section-header">
                        <h2 className="section-title">Все учителя ({teachers.length})</h2>
                        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                            <UserPlus size={18} />
                            <span>Добавить учителя</span>
                        </button>
                    </div>

                    {teachers.length === 0 ? (
                        <div className="empty-state">
                            <Users size={48} className="empty-icon" />
                            <p>Нет учителей. Добавьте первого!</p>
                        </div>
                    ) : (
                        <div className="users-list">
                            {teachers.map(t => {
                                const studentCount = allStudents.filter(s => s.createdBy === t.id).length;
                                const quizCount = allQuizzes.filter(q => q.createdBy === t.id).length;
                                return (
                                    <div key={t.id} className="user-row">
                                        <div className="user-row-info">
                                            <div className="user-row-avatar teacher-avatar">{t.fullName.charAt(0)}</div>
                                            <div>
                                                <div className="user-row-name">{t.fullName}</div>
                                                <div className="user-row-meta">
                                                    {t.role === 'deputy' ? 'Зам. директора' : 'Учитель'} · @{t.username} · {studentCount} учеников · {quizCount} экзаменов
                                                </div>
                                            </div>
                                        </div>
                                        <button className="btn btn-danger-ghost" onClick={() => handleDeleteTeacher(t.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ─── Students Tab ─── */}
            {tab === 'students' && (
                <div className="section-card">
                    <div className="section-header">
                        <h2 className="section-title">Все ученики ({allStudents.length})</h2>
                    </div>

                    {allStudents.length === 0 ? (
                        <div className="empty-state">
                            <GraduationCap size={48} className="empty-icon" />
                            <p>Нет учеников</p>
                            <p className="empty-hint">Ученики добавляются учителями</p>
                        </div>
                    ) : (
                        <div className="users-list">
                            {allStudents.map(s => {
                                const teacherName = getTeacherName(s.createdBy);
                                const studentResults = allResults.filter(r => r.studentId === s.id);
                                const avgScore = studentResults.length > 0
                                    ? Math.round(studentResults.reduce((acc, r) => acc + (r.score / r.maxScore) * 100, 0) / studentResults.length)
                                    : null;
                                return (
                                    <div key={s.id} className="user-row">
                                        <div className="user-row-info">
                                            <div className="user-row-avatar student-avatar">{s.fullName.charAt(0)}</div>
                                            <div>
                                                <div className="user-row-name">{s.fullName}</div>
                                                <div className="user-row-meta">
                                                    @{s.username} · Учитель: {teacherName} · Сдано экзаменов: {studentResults.length}
                                                    {avgScore !== null && ` · Средний балл: ${avgScore}%`}
                                                </div>
                                            </div>
                                        </div>
                                        <button className="btn btn-danger-ghost" onClick={() => handleDeleteStudent(s.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ─── Exams Tab ─── */}
            {tab === 'exams' && (
                <div className="section-card">
                    <div className="section-header">
                        <h2 className="section-title">Все экзамены ({allQuizzes.length})</h2>
                    </div>

                    {allQuizzes.length === 0 ? (
                        <div className="empty-state">
                            <BookOpen size={48} className="empty-icon" />
                            <p>Нет экзаменов</p>
                            <p className="empty-hint">Экзамены создаются учителями</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {allQuizzes.map(q => {
                                const resultsCount = getResultsCount(q.id);
                                const quizResults = allResults.filter(r => r.quizId === q.id);
                                const avgScore = quizResults.length > 0
                                    ? Math.round(quizResults.reduce((acc, r) => acc + (r.score / r.maxScore) * 100, 0) / quizResults.length)
                                    : null;

                                return (
                                    <div key={q.id} style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <div>
                                                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{q.title}</h3>
                                                {q.description && <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>{q.description}</p>}
                                            </div>
                                            <button className="btn btn-danger-ghost" onClick={() => handleDeleteQuiz(q.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            <div><strong>Автор:</strong> {getTeacherName(q.createdBy)}</div>
                                            <div><strong>Вопросов:</strong> {q.questions.length}</div>
                                            {q.timeLimitMinutes && <div><strong>Время:</strong> {q.timeLimitMinutes} мин</div>}
                                            <div><strong>Назначено:</strong> {q.assignedTo.length} уч.</div>
                                            <div><strong>Сдали:</strong> {resultsCount}</div>
                                            {avgScore !== null && <div><strong>Средний балл:</strong> {avgScore}%</div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Add Teacher Modal */}
            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Добавить пользователя</h3>
                            <button className="btn-icon" onClick={() => setShowForm(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddTeacher} className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Роль</label>
                                <select 
                                    className="form-input" 
                                    value={form.role} 
                                    onChange={e => setForm({ ...form, role: e.target.value as Role })}
                                >
                                    <option value="teacher">Учитель</option>
                                    <option value="deputy">Зам. директора</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Полное имя</label>
                                <input className="form-input" placeholder="Иванов Иван Иванович" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} autoFocus />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Логин</label>
                                <input className="form-input" placeholder="teacher1" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Пароль</label>
                                <input className="form-input" type="password" placeholder="••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                            </div>
                            {error && <div className="form-error">{error}</div>}
                            <button type="submit" className="btn btn-primary btn-full">Добавить</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
