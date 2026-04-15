import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Quiz, StudentResult } from './types';
import { getQuizzesForStudent, getResultsByStudent, hasStudentCompletedQuiz, getQuizById } from './db';
import { LogOut, BookOpen, Award, Clock, CheckCircle, Play, User, Calendar } from 'lucide-react';

interface StudentDashboardProps {
    onStartQuiz: (quiz: Quiz) => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ onStartQuiz }) => {
    const { user, logout } = useAuth();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [results, setResults] = useState<StudentResult[]>([]);
    const [tab, setTab] = useState<'available' | 'completed'>('available');
    const [now, setNow] = useState(new Date());

    const refresh = () => {
        setQuizzes(getQuizzesForStudent(user!.id));
        setResults(getResultsByStudent(user!.id));
    };

    useEffect(() => { 
        refresh(); 
        const timer = setInterval(() => setNow(new Date()), 1000); // Check every second
        return () => clearInterval(timer);
    }, []);

    const availableQuizzes = quizzes.filter(q => !hasStudentCompletedQuiz(user!.id, q.id));
    const completedQuizzes = results.map(r => ({
        result: r,
        quiz: getQuizById(r.quizId),
    })).filter(x => x.quiz);

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="dashboard-header-left">
                    <div className="dashboard-avatar student-bg">
                        <User size={20} />
                    </div>
                    <div>
                        <h1 className="dashboard-title">Мои экзамены</h1>
                        <p className="dashboard-user">{user?.fullName}</p>
                    </div>
                </div>
                <button className="btn btn-ghost" onClick={logout}>
                    <LogOut size={18} /><span>Выход</span>
                </button>
            </header>

            {/* Stats bar */}
            <div className="stats-grid stats-grid-2">
                <div className="stat-card stat-blue">
                    <BookOpen size={24} />
                    <div className="stat-value">{availableQuizzes.length}</div>
                    <div className="stat-label">Доступно экзаменов</div>
                </div>
                <div className="stat-card stat-green">
                    <Award size={24} />
                    <div className="stat-value">{completedQuizzes.length}</div>
                    <div className="stat-label">Пройдено</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab ${tab === 'available' ? 'tab-active' : ''}`} onClick={() => setTab('available')}>
                    <BookOpen size={16} /><span>Доступные экзамены</span>
                </button>
                <button className={`tab ${tab === 'completed' ? 'tab-active' : ''}`} onClick={() => setTab('completed')}>
                    <CheckCircle size={16} /><span>Мои результаты</span>
                </button>
            </div>

            {tab === 'available' && (
                <div className="section-card">
                    {availableQuizzes.length === 0 ? (
                        <div className="empty-state">
                            <BookOpen size={48} className="empty-icon" />
                            <p>Нет доступных экзаменов</p>
                            <p className="empty-hint">Экзамены появятся, когда учитель назначит их вам</p>
                        </div>
                    ) : (
                        <div className="quiz-list">
                            {availableQuizzes.map(q => {
                                const scheduledTime = q.scheduledAt ? new Date(q.scheduledAt) : null;
                                const isLocked = scheduledTime ? now < scheduledTime : false;
                                
                                return (
                                    <div key={q.id} className={`quiz-card quiz-card-student ${isLocked ? 'quiz-card-locked' : ''}`}>
                                        <div className="quiz-card-top">
                                            <div>
                                                <h3 className="quiz-card-title">{q.title}</h3>
                                                {q.description && <p className="quiz-card-desc">{q.description}</p>}
                                            </div>
                                        </div>
                                        <div className="quiz-card-meta">
                                            <span>{q.questions.length} вопросов</span>
                                            {q.timeLimitMinutes && (
                                                <>
                                                    <span>·</span>
                                                    <span><Clock size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {q.timeLimitMinutes} мин</span>
                                                </>
                                            )}
                                            {scheduledTime && (
                                                <>
                                                    <span>·</span>
                                                    <span className={isLocked ? 'text-primary' : ''}>
                                                        <Calendar size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> 
                                                        {scheduledTime.toLocaleDateString('ru-RU')} в {scheduledTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        <button 
                                            className={`btn btn-full ${isLocked ? 'btn-ghost' : 'btn-primary'}`} 
                                            onClick={() => !isLocked && onStartQuiz(q)}
                                            disabled={isLocked}
                                        >
                                            {isLocked ? (
                                                <><span>Доступно в назначенное время</span></>
                                            ) : (
                                                <><Play size={16} /><span>Начать экзамен</span></>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {tab === 'completed' && (
                <div>
                    {completedQuizzes.length === 0 ? (
                        <div className="section-card">
                            <div className="empty-state">
                                <Award size={48} className="empty-icon" />
                                <p>Вы ещё не прошли ни одного экзамена</p>
                            </div>
                        </div>
                    ) : (
                        <div className="quiz-list">
                            {completedQuizzes.map(({ result, quiz }) => {
                                const pct = Math.round((result.score / result.maxScore) * 100);
                                return (
                                    <div key={result.id} className="quiz-card">
                                        <div className="quiz-card-top">
                                            <div>
                                                <h3 className="quiz-card-title">{quiz!.title}</h3>
                                                <p className="quiz-card-desc">Дата сдачи: {new Date(result.completedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                            <span className={`badge badge-lg ${pct >= 70 ? 'badge-green' : pct >= 40 ? 'badge-yellow' : 'badge-red'}`}>
                                                {pct}%
                                            </span>
                                        </div>
                                        <div className="quiz-card-meta">
                                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                                                Набрано баллов: {result.score} из {result.maxScore}
                                            </span>
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

export default StudentDashboard;
