import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { User, Quiz, StudentResult, LiveStreamFeed } from './types';
import { getTeachers, getUsers, getQuizzes, getResults, getUserById, getLiveStreams, getQuizById } from './db';
import { LogOut, Users, BookOpen, BarChart3, ShieldCheck, GraduationCap, Clock, Award, Video, X } from 'lucide-react';

type DeputyTab = 'teachers' | 'students' | 'exams' | 'live';

const DeputyDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [tab, setTab] = useState<DeputyTab>('teachers');
    const [teachers, setTeachers] = useState<User[]>([]);
    const [allStudents, setAllStudents] = useState<User[]>([]);
    const [allQuizzes, setAllQuizzes] = useState<Quiz[]>([]);
    const [allResults, setAllResults] = useState<StudentResult[]>([]);
    const [stats, setStats] = useState({ teachers: 0, students: 0, quizzes: 0, avgScore: 0 });
    const [liveFeeds, setLiveFeeds] = useState<LiveStreamFeed[]>([]);

    const refresh = () => {
        const users = getUsers();
        const quizzes = getQuizzes();
        const results = getResults();
        const teachersList = users.filter(u => u.role === 'teacher');
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
        setLiveFeeds(getLiveStreams());
    };

    useEffect(() => { 
        refresh(); 
        const interval = setInterval(() => {
            setLiveFeeds(getLiveStreams());
        }, 5000);
        return () => clearInterval(interval);
    }, []);

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
                    <div className="dashboard-avatar teacher-bg">
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <h1 className="dashboard-title">Панель зам. директора</h1>
                        <p className="dashboard-user">{user?.fullName} · Наблюдатель</p>
                    </div>
                </div>
                <button className="btn btn-ghost" onClick={logout}>
                    <LogOut size={18} />
                    <span>Выход</span>
                </button>
            </header>

            {/* Stats */}
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
                    <div className="stat-label">Общая успеваемость</div>
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
                <button className={`tab ${tab === 'live' ? 'tab-active' : ''}`} onClick={() => setTab('live')}>
                    <Video size={16} /><span>Прямой эфир</span>
                </button>
            </div>

            {/* ─── Teachers Tab ─── */}
            {tab === 'teachers' && (
                <div className="section-card">
                    <div className="section-header">
                        <h2 className="section-title">Все учителя ({teachers.length})</h2>
                    </div>

                    {teachers.length === 0 ? (
                        <div className="empty-state">
                            <Users size={48} className="empty-icon" />
                            <p>Учителя не найдены</p>
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
                                                    @{t.username} · {studentCount} учеников · {quizCount} экзаменов
                                                </div>
                                            </div>
                                        </div>
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
                            <p>Ученики не найдены</p>
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
                                                    {avgScore !== null && ` · Успеваемость: ${avgScore}%`}
                                                </div>
                                            </div>
                                        </div>
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
                            <p>Экзамены не найдены</p>
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
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            <div><strong>Учитель:</strong> {getTeacherName(q.createdBy)}</div>
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

            {/* ─── Live Tab ─── */}
            {tab === 'live' && (
                <div className="section-card">
                    <h2 className="section-title">Прямой эфир (Экзамены в процессе)</h2>
                    {liveFeeds.length === 0 ? (
                        <div className="empty-state">
                            <Video size={48} className="empty-icon text-muted" />
                            <p>В данный момент никто не сдает экзамен</p>
                            <span className="text-muted" style={{ fontSize: '13px' }}>Эфир обновляется автоматически каждые 5 секунд</span>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                            {liveFeeds.map(feed => {
                                const student = getUserById(feed.studentId);
                                const quiz = getQuizById(feed.quizId);
                                return (
                                    <div key={feed.studentId} style={{ background: '#000', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '2px solid var(--border-color)' }}>
                                        <img src={feed.snapshot} alt="Live Feed" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                                        <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: 4, color: 'white', fontSize: 11, fontWeight: 'bold' }}>
                                            <div style={{ width: 8, height: 8, background: 'var(--danger)', borderRadius: '50%', animation: 'blink 1.5s infinite alternate' }}></div>
                                            LIVE
                                        </div>
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '12px', color: 'white' }}>
                                            <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{student?.fullName || 'Студент'}</p>
                                            <p style={{ margin: 0, fontSize: 12, opacity: 0.8, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{quiz?.title || 'Экзамен'}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DeputyDashboard;
