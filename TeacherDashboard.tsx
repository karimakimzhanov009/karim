import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { User, Quiz, QuizQuestion, StudentResult, LiveStreamFeed, Group } from './types';
import {
    getStudentsByTeacher, addUser, deleteUser,
    getQuizzesByTeacher, addQuiz, deleteQuiz, updateQuiz,
    getResultsByQuiz, getUserById, getLiveStreams, getQuizById,
    getGroupsByTeacher, addGroup, updateGroup, deleteGroup, updateUser
} from './db';
import { distributeScoreWeights, getScoreSummary } from './scoreDistribution';
import {
    LogOut, UserPlus, Trash2, Users, BookOpen, Plus, X,
    FileText, Upload, ChevronDown, ChevronUp, Award, CheckCircle, BarChart3,
    GraduationCap, Eye, XCircle, Video, Camera, Folder, Edit2, Settings, Lock, User as UserIcon,
    Calendar as CalendarIcon, Clock as ClockIcon, ChevronLeft, ChevronRight
} from 'lucide-react';

type Tab = 'students' | 'groups' | 'quizzes' | 'results' | 'live' | 'profile';

const TeacherDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [tab, setTab] = useState<Tab>('students');
    const [students, setStudents] = useState<User[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [showStudentForm, setShowStudentForm] = useState(false);
    const [showQuizForm, setShowQuizForm] = useState(false);
    const [studentForm, setStudentForm] = useState({ username: '', password: '', fullName: '' });
    const [error, setError] = useState<string | null>(null);

    // Quiz form state
    const [quizTitle, setQuizTitle] = useState('');
    const [quizDescription, setQuizDescription] = useState('');
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
    const [quizAssignedTo, setQuizAssignedTo] = useState<string[]>([]);
    const [quizAssignedGroups, setQuizAssignedGroups] = useState<string[]>([]);
    const [quizTimeLimit, setQuizTimeLimit] = useState<string>('30');
    const [quizDate, setQuizDate] = useState<string>('');
    const [quizTime, setQuizTime] = useState<string>('');

    // Results view
    const [viewingQuiz, setViewingQuiz] = useState<Quiz | null>(null);
    const [quizResults, setQuizResults] = useState<StudentResult[]>([]);
    const [viewingResult, setViewingResult] = useState<StudentResult | null>(null);
    const [viewingResultTab, setViewingResultTab] = useState<'answers' | 'recordings'>('answers');

    // Live Streams
    const [liveFeeds, setLiveFeeds] = useState<LiveStreamFeed[]>([]);

    // Group form state
    const [showGroupForm, setShowGroupForm] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [groupFormName, setGroupFormName] = useState('');
    const [groupFormStudents, setGroupFormStudents] = useState<string[]>([]);

    // Profile state
    const [profileName, setProfileName] = useState(user?.fullName || '');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
    const [profileError, setProfileError] = useState<string | null>(null);

    // Calendar state
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

    const fileInputRef = useRef<HTMLInputElement>(null);

    const refresh = () => {
        setStudents(getStudentsByTeacher(user!.id));
        setQuizzes(getQuizzesByTeacher(user!.id));
        setGroups(getGroupsByTeacher(user!.id));
    };

    useEffect(() => { refresh(); }, []);

    // Poll live feeds
    useEffect(() => {
        if (tab === 'live') {
            const fetchFeeds = () => setLiveFeeds(getLiveStreams());
            fetchFeeds();
            const interval = setInterval(fetchFeeds, 5000);
            return () => clearInterval(interval);
        }
    }, [tab]);

    // ─── Student Management ────────────────────────────────
    const handleAddStudent = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!studentForm.username.trim() || !studentForm.password.trim() || !studentForm.fullName.trim()) {
            setError('Заполните все поля');
            return;
        }
        try {
            addUser({
                id: crypto.randomUUID(),
                username: studentForm.username.trim(),
                password: studentForm.password,
                role: 'student',
                fullName: studentForm.fullName.trim(),
                createdBy: user!.id,
                createdAt: new Date().toISOString(),
            });
            setStudentForm({ username: '', password: '', fullName: '' });
            setShowStudentForm(false);
            refresh();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDeleteStudent = (id: string) => {
        if (confirm('Удалить ученика?')) {
            deleteUser(id);
            refresh();
        }
    };

    // ─── Group Management ─────────────────────────────────
    const openCreateGroup = () => {
        setEditingGroup(null);
        setGroupFormName('');
        setGroupFormStudents([]);
        setError(null);
        setShowGroupForm(true);
    };

    const openEditGroup = (g: Group) => {
        setEditingGroup(g);
        setGroupFormName(g.name);
        setGroupFormStudents([...g.studentIds]);
        setError(null);
        setShowGroupForm(true);
    };

    const handleSaveGroup = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!groupFormName.trim()) { setError('Введите название группы'); return; }
        if (editingGroup) {
            updateGroup({ ...editingGroup, name: groupFormName.trim(), studentIds: groupFormStudents });
        } else {
            addGroup({
                id: crypto.randomUUID(),
                name: groupFormName.trim(),
                createdBy: user!.id,
                studentIds: groupFormStudents,
                createdAt: new Date().toISOString(),
            });
        }
        setShowGroupForm(false);
        refresh();
    };

    const handleDeleteGroup = (id: string) => {
        if (confirm('Удалить группу?')) {
            deleteGroup(id);
            refresh();
        }
    };

    const toggleGroupStudent = (studentId: string) => {
        setGroupFormStudents(prev =>
            prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
        );
    };

    // ─── Quiz Creation ─────────────────────────────────────
    const addQuestion = () => {
        setQuizQuestions([...quizQuestions, {
            id: crypto.randomUUID(),
            text: '',
            type: 'text',
            options: ['', ''],
            correctAnswer: '',
            points: 0,
        }]);
    };

    const scoreSummary = useMemo(() => getScoreSummary(quizQuestions), [quizQuestions]);

    const updateQuestion = (index: number, updates: Partial<QuizQuestion>) => {
        const updated = [...quizQuestions];
        updated[index] = { ...updated[index], ...updates };
        setQuizQuestions(updated);
    };

    const removeQuestion = (index: number) => {
        setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
    };

    const addOption = (qIndex: number) => {
        const q = quizQuestions[qIndex];
        updateQuestion(qIndex, { options: [...(q.options || []), ''] });
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        const q = quizQuestions[qIndex];
        const opts = [...(q.options || [])];
        const oldVal = opts[oIndex];
        opts[oIndex] = value;
        
        if (q.correctAnswer === oldVal && oldVal !== '') {
            updateQuestion(qIndex, { options: opts, correctAnswer: value });
        } else {
            updateQuestion(qIndex, { options: opts });
        }
    };

    const removeOption = (qIndex: number, oIndex: number) => {
        const q = quizQuestions[qIndex];
        const opts = (q.options || []).filter((_, i) => i !== oIndex);
        updateQuestion(qIndex, { options: opts });
    };

    const handleCreateQuiz = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!quizTitle.trim()) { setError('Введите название экзамена'); return; }
        if (quizQuestions.length === 0) { setError('Добавьте хотя бы один вопрос'); return; }

        for (let i = 0; i < quizQuestions.length; i++) {
            const q = quizQuestions[i];
            if (!q.text.trim()) { setError(`Вопрос ${i + 1}: введите текст`); return; }
            if (!q.correctAnswer.trim()) { setError(`Вопрос ${i + 1}: укажите правильный ответ`); return; }
            if (q.type === 'choice' && (!q.options || q.options.filter(o => o.trim()).length < 2)) {
                setError(`Вопрос ${i + 1}: минимум 2 варианта ответа`); return;
            }
        }

        let distributedQuestions: QuizQuestion[];
        try {
            distributedQuestions = distributeScoreWeights(quizQuestions);
        } catch (err: any) {
            setError(err.message);
            return;
        }

        const quiz: Quiz = {
            id: crypto.randomUUID(),
            title: quizTitle.trim(),
            description: quizDescription.trim(),
            createdBy: user!.id,
            assignedTo: quizAssignedTo,
            assignedGroups: quizAssignedGroups,
            questions: distributedQuestions.map(q => ({
                ...q,
                options: q.type === 'choice' ? q.options?.filter(o => o.trim()) : undefined,
            })),
            timeLimitMinutes: parseInt(quizTimeLimit) > 0 ? parseInt(quizTimeLimit) : undefined,
            scheduledAt: quizDate && quizTime ? new Date(`${quizDate}T${quizTime}`).toISOString() : undefined,
            createdAt: new Date().toISOString(),
        };

        addQuiz(quiz);
        resetQuizForm();
        setShowQuizForm(false);
        refresh();
    };

    const resetQuizForm = () => {
        setQuizTitle('');
        setQuizDescription('');
        setQuizQuestions([]);
        setQuizAssignedTo([]);
        setQuizAssignedGroups([]);
        setQuizTimeLimit('30');
        setQuizDate('');
        setQuizTime('');
        setError(null);
    };

    // ─── JSON Import ───────────────────────────────────────
    const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                if (Array.isArray(data)) {
                    const imported: QuizQuestion[] = data.map((q: any, i: number) => ({
                        id: crypto.randomUUID(),
                        text: q.text || q.question || `Вопрос ${i + 1}`,
                        type: q.type === 'choice' ? 'choice' : 'text',
                        options: q.options || [],
                        correctAnswer: q.correctAnswer || q.answer || '',
                        points: q.points ? Number(q.points) : 0,
                    }));
                    setQuizQuestions([...quizQuestions, ...imported]);
                } else {
                    setError('JSON должен быть массивом вопросов');
                }
            } catch {
                setError('Ошибка чтения JSON файла');
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ─── View Results ──────────────────────────────────────
    const openResults = (quiz: Quiz) => {
        setViewingQuiz(quiz);
        setQuizResults(getResultsByQuiz(quiz.id));
        setTab('results');
    };

    const handleDeleteQuiz = (id: string) => {
        if (confirm('Удалить экзамен?')) {
            deleteQuiz(id);
            refresh();
        }
    };

    const toggleAssign = (studentId: string) => {
        setQuizAssignedTo(prev =>
            prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
        );
    };

    const toggleAssignGroup = (group: Group) => {
        setQuizAssignedGroups(prev =>
            prev.includes(group.id) ? prev.filter(id => id !== group.id) : [...prev, group.id]
        );
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="dashboard-header-left">
                    <div className="dashboard-avatar teacher-bg">
                        <GraduationCap size={20} />
                    </div>
                    <div>
                        <h1 className="dashboard-title">Панель учителя</h1>
                        <p className="dashboard-user">{user?.fullName}</p>
                    </div>
                </div>
                <button className="btn btn-ghost" onClick={logout}>
                    <LogOut size={18} /><span>Выход</span>
                </button>
            </header>
            
            {/* Stats bar */}
            <div className="stats-grid">
                <div className="stat-card stat-blue">
                    <Users size={24} />
                    <div className="stat-value">{students.length}</div>
                    <div className="stat-label">Мои ученики</div>
                </div>
                <div className="stat-card stat-purple">
                    <Folder size={24} />
                    <div className="stat-value">{groups.length}</div>
                    <div className="stat-label">Мои группы</div>
                </div>
                <div className="stat-card stat-green">
                    <BookOpen size={24} />
                    <div className="stat-value">{quizzes.length}</div>
                    <div className="stat-label">Экзаменов</div>
                </div>
                <div className="stat-card stat-orange">
                    <BarChart3 size={24} />
                    <div className="stat-value">
                        {(() => {
                            const allTeacherResults = getQuizzesByTeacher(user!.id).flatMap(q => getResultsByQuiz(q.id));
                            if (allTeacherResults.length === 0) return '0%';
                            const avg = Math.round(allTeacherResults.reduce((acc, r) => acc + (r.score / r.maxScore) * 100, 0) / allTeacherResults.length);
                            return `${avg}%`;
                        })()}
                    </div>
                    <div className="stat-label">Успеваемость</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab ${tab === 'students' ? 'tab-active' : ''}`} onClick={() => setTab('students')}>
                    <Users size={16} /><span>Ученики ({students.length})</span>
                </button>
                <button className={`tab ${tab === 'groups' ? 'tab-active' : ''}`} onClick={() => setTab('groups')}>
                    <Folder size={16} /><span>Группы ({groups.length})</span>
                </button>
                <button className={`tab ${tab === 'quizzes' ? 'tab-active' : ''}`} onClick={() => setTab('quizzes')}>
                    <BookOpen size={16} /><span>Экзамены ({quizzes.length})</span>
                </button>
                <button className={`tab ${tab === 'results' ? 'tab-active' : ''}`} onClick={() => setTab('results')}>
                    <Award size={16} /><span>Результаты</span>
                </button>
                <button className={`tab ${tab === 'live' ? 'tab-active' : ''}`} onClick={() => setTab('live')}>
                    <Video size={16} /><span>Прямой эфир</span>
                </button>
                <button className={`tab ${tab === 'profile' ? 'tab-active' : ''}`} onClick={() => setTab('profile')}>
                    <UserIcon size={16} /><span>Личный кабинет</span>
                </button>
            </div>

            {/* Students Tab */}
            {tab === 'students' && (
                <div className="section-card">
                    <div className="section-header">
                        <h2 className="section-title">Мои ученики</h2>
                        <button className="btn btn-primary" onClick={() => setShowStudentForm(true)}>
                            <UserPlus size={18} /><span>Добавить ученика</span>
                        </button>
                    </div>

                    {showStudentForm && (
                        <div className="modal-overlay" onClick={() => setShowStudentForm(false)}>
                            <div className="modal" onClick={e => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>Добавить ученика</h3>
                                    <button className="btn-icon" onClick={() => setShowStudentForm(false)}><X size={20} /></button>
                                </div>
                                <form onSubmit={handleAddStudent} className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Полное имя</label>
                                        <input className="form-input" placeholder="Петров Петр" value={studentForm.fullName} onChange={e => setStudentForm({ ...studentForm, fullName: e.target.value })} autoFocus />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Логин</label>
                                        <input className="form-input" placeholder="student1" value={studentForm.username} onChange={e => setStudentForm({ ...studentForm, username: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Пароль</label>
                                        <input className="form-input" type="password" placeholder="••••••" value={studentForm.password} onChange={e => setStudentForm({ ...studentForm, password: e.target.value })} />
                                    </div>
                                    {error && <div className="form-error">{error}</div>}
                                    <button type="submit" className="btn btn-primary btn-full">Добавить</button>
                                </form>
                            </div>
                        </div>
                    )}

                    {students.length === 0 ? (
                        <div className="empty-state">
                            <Users size={48} className="empty-icon" />
                            <p>Нет учеников. Добавьте первого!</p>
                        </div>
                    ) : (
                        <div className="users-list">
                            {students.map(s => {
                                const studentGroups = groups.filter(g => g.studentIds.includes(s.id));
                                return (
                                    <div key={s.id} className="user-row">
                                        <div className="user-row-info">
                                            <div className="user-row-avatar student-avatar">{s.fullName.charAt(0)}</div>
                                            <div>
                                                <div className="user-row-name">{s.fullName}</div>
                                                <div className="user-row-meta">@{s.username}
                                                    {studentGroups.length > 0 && (
                                                        <span style={{ marginLeft: 8, color: 'var(--primary)', fontWeight: 500 }}>
                                                            · {studentGroups.map(g => g.name).join(', ')}
                                                        </span>
                                                    )}
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

            {/* Groups Tab */}
            {tab === 'groups' && (
                <div className="section-card">
                    <div className="section-header">
                        <h2 className="section-title">Мои группы</h2>
                        <button className="btn btn-primary" onClick={openCreateGroup}>
                            <Plus size={18} /><span>Создать группу</span>
                        </button>
                    </div>

                    {showGroupForm && (
                        <div className="modal-overlay" onClick={() => setShowGroupForm(false)}>
                            <div className="modal" onClick={e => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>{editingGroup ? 'Редактировать группу' : 'Создать группу'}</h3>
                                    <button className="btn-icon" onClick={() => setShowGroupForm(false)}><X size={20} /></button>
                                </div>
                                <form onSubmit={handleSaveGroup} className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Название группы</label>
                                        <input
                                            className="form-input"
                                            placeholder="Группа А"
                                            value={groupFormName}
                                            onChange={e => setGroupFormName(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Участники ({groupFormStudents.length})</label>
                                        {students.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Нет доступных учеников</p>
                                        ) : (
                                            <div className="assign-grid">
                                                {students.map(s => (
                                                    <label key={s.id} className={`assign-chip ${groupFormStudents.includes(s.id) ? 'assign-chip-active' : ''}`}>
                                                        <input type="checkbox" checked={groupFormStudents.includes(s.id)} onChange={() => toggleGroupStudent(s.id)} className="sr-only" />
                                                        <span>{s.fullName}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {error && <div className="form-error">{error}</div>}
                                    <button type="submit" className="btn btn-primary btn-full">
                                        {editingGroup ? 'Сохранить' : 'Создать группу'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {groups.length === 0 ? (
                        <div className="empty-state">
                            <Folder size={48} className="empty-icon" />
                            <p>Нет групп. Создайте первую!</p>
                        </div>
                    ) : (
                        <div className="users-list">
                            {groups.map(g => (
                                <div key={g.id} className="user-row">
                                    <div className="user-row-info">
                                        <div className="user-row-avatar" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                            <Folder size={18} />
                                        </div>
                                        <div>
                                            <div className="user-row-name">{g.name}</div>
                                            <div className="user-row-meta">
                                                {g.studentIds.length} {g.studentIds.length === 1 ? 'ученик' : g.studentIds.length < 5 ? 'ученика' : 'учеников'}
                                                {g.studentIds.length > 0 && (
                                                    <span style={{ marginLeft: 8, opacity: 0.7 }}>
                                                        · {g.studentIds.map(id => students.find(s => s.id === id)?.fullName).filter(Boolean).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-ghost" style={{ padding: '6px 10px' }} onClick={() => openEditGroup(g)}>
                                            <Edit2 size={15} />
                                        </button>
                                        <button className="btn btn-danger-ghost" onClick={() => handleDeleteGroup(g.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Quizzes Tab */}
            {tab === 'quizzes' && (
                <div className="section-card">
                    <div className="section-header">
                        <h2 className="section-title">Мои экзамены</h2>
                        <button className="btn btn-primary" onClick={() => { resetQuizForm(); setShowQuizForm(true); }}>
                            <Plus size={18} /><span>Создать экзамен</span>
                        </button>
                    </div>

                    {showQuizForm && (
                        <div className="modal-overlay" onClick={() => setShowQuizForm(false)}>
                            <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>Создать экзамен</h3>
                                    <button className="btn-icon" onClick={() => setShowQuizForm(false)}><X size={20} /></button>
                                </div>
                                <form onSubmit={handleCreateQuiz} className="modal-body quiz-form">
                                    <div className="form-row">
                                        <div className="form-group flex-1">
                                            <label className="form-label">Название экзамена</label>
                                            <input className="form-input" placeholder="Экзамен по Python" value={quizTitle} onChange={e => setQuizTitle(e.target.value)} autoFocus />
                                        </div>
                                        <div className="form-group" style={{ width: 120 }}>
                                            <label className="form-label">Время (мин)</label>
                                            <input className="form-input" type="number" min={0} value={quizTimeLimit} onChange={e => setQuizTimeLimit(e.target.value)} />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group flex-1">
                                            <label className="form-label">Дата проведения</label>
                                            <input className="form-input" type="date" value={quizDate} onChange={e => setQuizDate(e.target.value)} />
                                        </div>
                                        <div className="form-group flex-1">
                                            <label className="form-label">Время начала</label>
                                            <input className="form-input" type="time" value={quizTime} onChange={e => setQuizTime(e.target.value)} />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Описание (необязательно)</label>
                                        <input className="form-input" placeholder="Описание экзамена..." value={quizDescription} onChange={e => setQuizDescription(e.target.value)} />
                                    </div>

                                    {/* Assign Students */}
                                    {students.length > 0 && (
                                        <div className="form-group">
                                            <label className="form-label">Назначить ученикам</label>

                                            {/* Quick group selection */}
                                            {groups.length > 0 && (
                                                <div style={{ marginBottom: 10 }}>
                                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Быстрый выбор по группе:</p>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                        {groups.map(g => {
                                                            const allSelected = quizAssignedGroups.includes(g.id);
                                                            return (
                                                                <button
                                                                    key={g.id}
                                                                    type="button"
                                                                    onClick={() => toggleAssignGroup(g)}
                                                                    style={{
                                                                        display: 'flex', alignItems: 'center', gap: 6,
                                                                        padding: '5px 12px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                                                                        border: `1.5px solid ${allSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                                                                        background: allSelected ? 'rgba(99,102,241,0.12)' : 'transparent',
                                                                        color: allSelected ? 'var(--primary)' : 'var(--text-secondary)',
                                                                        fontWeight: allSelected ? 600 : 400,
                                                                        transition: 'all 0.15s',
                                                                    }}
                                                                >
                                                                    <Folder size={13} />
                                                                    {g.name} ({g.studentIds.length})
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="assign-grid">
                                                {students.map(s => (
                                                    <label key={s.id} className={`assign-chip ${quizAssignedTo.includes(s.id) ? 'assign-chip-active' : ''}`}>
                                                        <input type="checkbox" checked={quizAssignedTo.includes(s.id)} onChange={() => toggleAssign(s.id)} className="sr-only" />
                                                        <span>{s.fullName}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Questions */}
                                    <div className="form-group">
                                        <div className="form-label-row">
                                            <label className="form-label">Вопросы ({quizQuestions.length})</label>
                                            <div className="btn-group">
                                                <button type="button" className="btn btn-sm btn-outline" onClick={() => fileInputRef.current?.click()}>
                                                    <Upload size={14} /><span>Импорт JSON</span>
                                                </button>
                                                <input ref={fileInputRef} type="file" accept=".json" className="sr-only" onChange={handleJsonImport} />
                                                <button type="button" className="btn btn-sm btn-outline" onClick={addQuestion}>
                                                    <Plus size={14} /><span>Добавить</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="questions-list">
                                            {quizQuestions.map((q, qi) => (
                                                <div key={q.id} className="question-card">
                                                    <div className="question-card-header">
                                                        <span className="question-number">#{qi + 1}</span>
                                                        <select
                                                            className="form-select-sm"
                                                            value={q.type}
                                                            onChange={e => updateQuestion(qi, { type: e.target.value as 'choice' | 'text' })}
                                                        >
                                                            <option value="text">Текстовый ответ</option>
                                                            <option value="choice">Выбор из списка</option>
                                                        </select>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', marginRight: '8px' }}>
                                                            <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Баллы:</label>
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={100}
                                                                className="form-input"
                                                                style={{ width: '70px', padding: '4px 8px', height: '28px' }}
                                                                placeholder="Авто"
                                                                value={q.points || ''}
                                                                onChange={e => updateQuestion(qi, { points: Number(e.target.value) || 0 })}
                                                            />
                                                        </div>
                                                        <button type="button" className="btn-icon btn-danger-ghost" onClick={() => removeQuestion(qi)}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>

                                                    <input
                                                        className="form-input"
                                                        placeholder="Текст вопроса..."
                                                        value={q.text}
                                                        onChange={e => updateQuestion(qi, { text: e.target.value })}
                                                    />

                                                    {q.type === 'choice' && (
                                                        <div className="options-list">
                                                            {(q.options || []).map((opt, oi) => (
                                                                <div key={oi} className="option-row">
                                                                    <input
                                                                        type="radio"
                                                                        name={`correct-${q.id}`}
                                                                        checked={q.correctAnswer === opt && opt !== ''}
                                                                        onChange={() => {
                                                                            if (!opt.trim()) {
                                                                                alert('Сначала введите текст варианта, затем отметьте его.');
                                                                                return;
                                                                            }
                                                                            updateQuestion(qi, { correctAnswer: opt });
                                                                        }}
                                                                        className="option-radio"
                                                                    />
                                                                    <input
                                                                        className="form-input flex-1"
                                                                        placeholder={`Вариант ${oi + 1}`}
                                                                        value={opt}
                                                                        onChange={e => updateOption(qi, oi, e.target.value)}
                                                                    />
                                                                    {(q.options || []).length > 2 && (
                                                                        <button type="button" className="btn-icon" onClick={() => removeOption(qi, oi)}>
                                                                            <X size={14} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            <button type="button" className="btn btn-sm btn-ghost" onClick={() => addOption(qi)}>
                                                                <Plus size={14} /><span>Добавить вариант</span>
                                                            </button>
                                                        </div>
                                                    )}

                                                    {q.type === 'text' && (
                                                        <div className="form-group" style={{ marginTop: 8 }}>
                                                            <input
                                                                className="form-input correct-answer-input"
                                                                placeholder="Правильный ответ"
                                                                value={q.correctAnswer}
                                                                onChange={e => updateQuestion(qi, { correctAnswer: e.target.value })}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            {quizQuestions.length === 0 && (
                                                <div className="empty-state-sm">
                                                    <FileText size={32} className="empty-icon" />
                                                    <p>Добавьте вопросы вручную или импортируйте из JSON</p>
                                                    <p className="empty-hint">Формат JSON: [{"{"}"text": "Вопрос?", "type": "text", "correctAnswer": "Ответ"{"}"}]</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Score distribution indicator */}
                                        {quizQuestions.length > 0 && (
                                            <div style={{
                                                marginTop: '12px',
                                                padding: '12px 16px',
                                                borderRadius: '8px',
                                                backgroundColor: scoreSummary.isValid ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                                border: `1px solid ${scoreSummary.isValid ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                                fontSize: '13px',
                                                color: scoreSummary.isValid ? '#22c55e' : '#ef4444',
                                            }}>
                                                {scoreSummary.isValid ? (
                                                    <>
                                                        <strong>Итого: 100 баллов</strong>
                                                        {scoreSummary.emptyCount > 0 && (
                                                            <span style={{ marginLeft: '8px', opacity: 0.8 }}>
                                                                · Указано {scoreSummary.filledSum} из 100, остаток ({scoreSummary.remaining}) распределится на {scoreSummary.emptyCount} вопр. автоматически
                                                            </span>
                                                        )}
                                                        {scoreSummary.emptyCount === 0 && (
                                                            <span style={{ marginLeft: '8px', opacity: 0.8 }}>
                                                                · Все баллы заданы вручную ✓
                                                            </span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <strong>⚠ {scoreSummary.error}</strong>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {error && <div className="form-error">{error}</div>}
                                    <button type="submit" className="btn btn-primary btn-full">Создать экзамен</button>
                                </form>
                            </div>
                        </div>
                    )}

                    {quizzes.length === 0 ? (
                        <div className="empty-state">
                            <BookOpen size={48} className="empty-icon" />
                            <p>Нет экзаменов. Создайте первый!</p>
                        </div>
                    ) : (
                        <div className="quiz-list">
                            {quizzes.map(q => (
                                <div key={q.id} className="quiz-card">
                                    <div className="quiz-card-top">
                                        <div>
                                            <h3 className="quiz-card-title">{q.title}</h3>
                                            {q.description && <p className="quiz-card-desc">{q.description}</p>}
                                        </div>
                                    </div>
                                    <div className="quiz-card-meta">
                                        <span>{q.questions.length} вопр.</span>
                                        <span>·</span>
                                        <span>{q.assignedTo.length + (q.assignedGroups?.length || 0)} назн.</span>
                                        {q.timeLimitMinutes && <><span>·</span><span>{q.timeLimitMinutes} мин</span></>}
                                    </div>
                                    <div className="quiz-card-actions">
                                        <button className="btn btn-sm btn-outline" onClick={() => openResults(q)}>
                                            <Eye size={14} /><span>Результаты</span>
                                        </button>
                                        <button className="btn btn-sm btn-danger-ghost" onClick={() => handleDeleteQuiz(q.id)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Results Tab */}
            {tab === 'results' && (
                <div className="section-card">
                    <h2 className="section-title">Результаты экзаменов</h2>
                    {!viewingQuiz ? (
                        <div className="quiz-list">
                            {quizzes.length === 0 ? (
                                <div className="empty-state">
                                    <Award size={48} className="empty-icon" />
                                    <p>Нет экзаменов для просмотра результатов</p>
                                </div>
                            ) : (
                                quizzes.map(q => {
                                    const results = getResultsByQuiz(q.id);
                                    return (
                                        <div key={q.id} className="quiz-card clickable" onClick={() => openResults(q)}>
                                            <h3 className="quiz-card-title">{q.title}</h3>
                                            <div className="quiz-card-meta">
                                                <span>{results.length} ответов</span>
                                                <span>·</span>
                                                <span>{q.questions.length} вопр.</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    ) : (
                        <div>
                            <button className="btn btn-ghost mb-4" onClick={() => setViewingQuiz(null)}>
                                ← Назад к списку
                            </button>
                            <h3 className="section-subtitle">{viewingQuiz.title}</h3>
                            {quizResults.length === 0 ? (
                                <div className="empty-state">
                                    <Award size={48} className="empty-icon" />
                                    <p>Пока никто не прошёл этот экзамен</p>
                                </div>
                            ) : (
                                <div className="results-table-wrapper">
                                    <table className="results-table">
                                        <thead>
                                            <tr>
                                                <th>Ученик</th>
                                                <th>Балл</th>
                                                <th>Процент</th>
                                                <th>Дата</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {quizResults.map(r => {
                                                const student = getUserById(r.studentId);
                                                const pct = Math.round((r.score / r.maxScore) * 100);
                                                return (
                                                    <tr key={r.id} className="clickable" onClick={() => setViewingResult(r)} title="Нажмите для просмотра ответов">
                                                        <td>{student?.fullName || 'Неизвестный'}</td>
                                                        <td className="font-mono">{r.score}/{r.maxScore}</td>
                                                        <td>
                                                            <span className={`badge ${pct >= 70 ? 'badge-green' : pct >= 40 ? 'badge-yellow' : 'badge-red'}`}>
                                                                {pct}%
                                                            </span>
                                                        </td>
                                                        <td className="text-muted">{new Date(r.completedAt).toLocaleString('ru-RU')}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Live Streaming Tab */}
            {tab === 'live' && (
                <div className="section-card">
                    <h2 className="section-title">Прямой эфир (Экзамены в процессе)</h2>
                    {liveFeeds.length === 0 ? (
                        <div className="empty-state">
                            <Video size={48} className="empty-icon text-muted" />
                            <p>В данный момент никто не сдает экзамен</p>
                            <span className="text-muted" style={{ fontSize: '13px' }}>Эфир обновляется автоматически каждые 5-10 секунд</span>
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

            {/* Detailed Result Modal */}
            {viewingResult && viewingQuiz && (
                <div className="modal-overlay" onClick={() => setViewingResult(null)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ margin: 0 }}>Результаты: {getUserById(viewingResult.studentId)?.fullName || 'Неизвестный'}</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                                    Баллы: {viewingResult.score} из {viewingResult.maxScore}
                                </p>
                            </div>
                            <button className="btn-icon" onClick={() => setViewingResult(null)}><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', padding: 0 }}>
                            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 24px', position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 2 }}>
                                <button className={`tab ${viewingResultTab === 'answers' ? 'tab-active' : ''}`} onClick={() => setViewingResultTab('answers')} style={{ padding: '12px 16px', background: 'none' }}>Ответы</button>
                                {viewingResult.snapshots && viewingResult.snapshots.length > 0 && (
                                    <button className={`tab ${viewingResultTab === 'recordings' ? 'tab-active' : ''}`} onClick={() => setViewingResultTab('recordings')} style={{ padding: '12px 16px', background: 'none' }}>
                                        <Camera size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />Скриншоты с камеры ({viewingResult.snapshots.length})
                                    </button>
                                )}
                            </div>

                            <div style={{ padding: '24px' }}>
                                {viewingResultTab === 'answers' ? (
                                    <div className="quiz-review">
                                        {viewingQuiz.questions.map((q, i) => {
                                            const studentAnswer = (viewingResult.answers[q.id] || '').trim().toLowerCase();
                                            const correct = q.correctAnswer.trim().toLowerCase();
                                            const isCorrect = studentAnswer === correct;
                                            return (
                                                <div key={q.id} className={`review-item ${isCorrect ? 'review-correct' : 'review-wrong'}`}>
                                                    <div className="review-header">
                                                        <span className="review-number">#{i + 1}</span>
                                                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{isCorrect ? (q.points || 0) : 0} / {q.points || 0} б.</span>
                                                            {isCorrect ? <CheckCircle size={16} className="text-green" /> : <XCircle size={16} className="text-red" />}
                                                        </div>
                                                    </div>
                                                    <p className="review-question">{q.text}</p>
                                                    <div className="review-answers">
                                                        <p><span className="review-label">Ответ ученика:</span> {viewingResult.answers[q.id] || '—'}</p>
                                                        {!isCorrect && <p><span className="review-label">Правильный ответ:</span> {q.correctAnswer}</p>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="recordings-gallery" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                                        {viewingResult.snapshots?.map((snap, i) => (
                                            <div key={i} style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
                                                <img src={snap.image} alt={`Скриншот ${i + 1}`} style={{ width: '100%', display: 'block' }} loading="lazy" />
                                                <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', background: 'var(--bg-page)' }}>
                                                    {new Date(snap.timestamp).toLocaleTimeString('ru-RU')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Tab */}
            {tab === 'profile' && (
                <div className="section-card">
                    <h2 className="section-title">Личный кабинет</h2>
                    
                    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 0' }}>
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <div className="dashboard-avatar teacher-bg" style={{ width: '80px', height: '80px', fontSize: '32px', margin: '0 auto 16px' }}>
                                <GraduationCap size={40} />
                            </div>
                            <h3 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '4px' }}>{user?.fullName}</h3>
                            <p style={{ color: 'var(--text-muted)' }}>@{user?.username} · Преподаватель</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Calendar Section */}
                            <div style={{ background: 'var(--bg-page)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <CalendarIcon size={20} className="text-primary" />
                                        <h4 style={{ fontWeight: 600, margin: 0 }}>Календарь экзаменов</h4>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <button className="btn-icon" onClick={() => {
                                            if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
                                            else { setCurrentMonth(currentMonth - 1); }
                                        }}><ChevronLeft size={18} /></button>
                                        <span style={{ fontSize: '14px', fontWeight: 600, minWidth: '100px', textAlign: 'center' }}>
                                            {new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(new Date(currentYear, currentMonth))}
                                        </span>
                                        <button className="btn-icon" onClick={() => {
                                            if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
                                            else { setCurrentMonth(currentMonth + 1); }
                                        }}><ChevronRight size={18} /></button>
                                    </div>
                                </div>

                                <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '20px', textAlign: 'center' }}>
                                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
                                        <div key={d} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>{d}</div>
                                    ))}
                                    {/* Empty cells for start of month */}
                                    {Array.from({ length: (new Date(currentYear, currentMonth, 1).getDay() || 7) - 1 }).map((_, i) => (
                                        <div key={`empty-${i}`} />
                                    ))}
                                    {/* Days of month */}
                                    {Array.from({ length: new Date(currentYear, currentMonth + 1, 0).getDate() }).map((_, i) => {
                                        const day = i + 1;
                                        const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const hasExams = quizzes.some(q => q.scheduledAt && q.scheduledAt.startsWith(dateString));
                                        const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === currentMonth && selectedDate?.getFullYear() === currentYear;
                                        const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, day).toDateString();

                                        return (
                                            <div 
                                                key={day} 
                                                onClick={() => setSelectedDate(new Date(currentYear, currentMonth, day))}
                                                style={{ 
                                                    height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', 
                                                    cursor: 'pointer', fontSize: '14px', position: 'relative',
                                                    background: isSelected ? 'var(--primary)' : isToday ? 'rgba(99,102,241,0.1)' : 'transparent',
                                                    color: isSelected ? 'white' : 'inherit',
                                                    border: isToday ? '1px solid var(--primary)' : 'none',
                                                    fontWeight: isSelected || isToday ? 600 : 400
                                                }}
                                            >
                                                {day}
                                                {hasExams && !isSelected && (
                                                    <div style={{ position: 'absolute', bottom: '4px', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary)' }} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Scheduled Exams for selected date */}
                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                                    <h5 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                                        {selectedDate ? `Экзамены на ${selectedDate.toLocaleDateString('ru-RU')}` : 'Выберите дату'}
                                    </h5>
                                    {selectedDate && (() => {
                                        const dateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                                        const dayExams = quizzes.filter(q => q.scheduledAt && q.scheduledAt.startsWith(dateString));
                                        
                                        if (dayExams.length === 0) return <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Нет запланированных экзаменов</p>;
                                        
                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {dayExams.map(q => (
                                                    <div key={q.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: 'rgba(99,102,241,0.05)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.1)' }}>
                                                        <div>
                                                            <div style={{ fontSize: '14px', fontWeight: 600 }}>{q.title}</div>
                                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <ClockIcon size={12} /> {new Date(q.scheduledAt!).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                        <button className="btn btn-sm btn-outline" onClick={() => { setViewingQuiz(q); setTab('quizzes'); setViewingQuiz(null); /* Quick trick to jump back to quizzes */ setTab('quizzes'); }}>Смотреть</button>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* General Settings */}
                            <div style={{ background: 'var(--bg-page)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                    <UserIcon size={20} className="text-primary" />
                                    <h4 style={{ fontWeight: 600, margin: 0 }}>Основные данные</h4>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Полное имя</label>
                                    <input 
                                        className="form-input" 
                                        value={profileName} 
                                        onChange={e => setProfileName(e.target.value)} 
                                        placeholder="Введите ваше имя"
                                    />
                                </div>
                                <button 
                                    className="btn btn-primary" 
                                    style={{ marginTop: '12px' }}
                                    onClick={() => {
                                        if (!profileName.trim()) return;
                                        const updatedUser = { ...user!, fullName: profileName.trim() };
                                        updateUser(updatedUser);
                                        // Update local user state if needed, though usually AuthContext handles it via reload or we just reload
                                        window.location.reload(); // Simplest way to refresh all references
                                    }}
                                >
                                    Сохранить имя
                                </button>
                            </div>

                            {/* Password Settings */}
                            <div style={{ background: 'var(--bg-page)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                    <Lock size={20} className="text-primary" />
                                    <h4 style={{ fontWeight: 600, margin: 0 }}>Изменение пароля</h4>
                                </div>
                                
                                <div style={{ display: 'grid', gap: '16px' }}>
                                    <div className="form-group">
                                        <label className="form-label">Текущий пароль</label>
                                        <input 
                                            type="password" 
                                            className="form-input" 
                                            value={oldPassword} 
                                            onChange={e => setOldPassword(e.target.value)} 
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Новый пароль</label>
                                        <input 
                                            type="password" 
                                            className="form-input" 
                                            value={newPassword} 
                                            onChange={e => setNewPassword(e.target.value)} 
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Подтвердите новый пароль</label>
                                        <input 
                                            type="password" 
                                            className="form-input" 
                                            value={confirmPassword} 
                                            onChange={e => setConfirmPassword(e.target.value)} 
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                {profileError && <div className="form-error" style={{ marginTop: '16px' }}>{profileError}</div>}
                                {profileSuccess && <div style={{ marginTop: '16px', padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', fontSize: '14px' }}>{profileSuccess}</div>}

                                <button 
                                    className="btn btn-primary" 
                                    style={{ marginTop: '16px' }}
                                    onClick={() => {
                                        setProfileError(null);
                                        setProfileSuccess(null);
                                        
                                        if (oldPassword !== user?.password) {
                                            setProfileError('Неверный текущий пароль');
                                            return;
                                        }
                                        if (newPassword.length < 4) {
                                            setProfileError('Пароль должен быть не менее 4 символов');
                                            return;
                                        }
                                        if (newPassword !== confirmPassword) {
                                            setProfileError('Пароли не совпадают');
                                            return;
                                        }

                                        const updatedUser = { ...user!, password: newPassword };
                                        updateUser(updatedUser);
                                        setProfileSuccess('Пароль успешно изменен');
                                        setOldPassword('');
                                        setNewPassword('');
                                        setConfirmPassword('');
                                    }}
                                >
                                    Сменить пароль
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;
