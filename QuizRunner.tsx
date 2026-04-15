import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Quiz, QuizQuestion, StudentResult, ExamSnapshot } from './types';
import { addResult, updateLiveStream, removeLiveStream } from './db';
import { Clock, ChevronRight, CheckCircle, XCircle, ArrowLeft, Video, AlertTriangle, Eye, UserCheck } from 'lucide-react';

interface QuizRunnerProps {
    quiz: Quiz;
    studentId: string;
    onFinish: () => void;
}

const QuizRunner: React.FC<QuizRunnerProps> = ({ quiz, studentId, onFinish }) => {
    const [hasStarted, setHasStarted] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [finished, setFinished] = useState(false);
    const [timeLeft, setTimeLeft] = useState((quiz.timeLimitMinutes || 30) * 60);
    const [result, setResult] = useState<StudentResult | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [violationCount, setViolationCount] = useState(0);
    const [showViolationOverlay, setShowViolationOverlay] = useState(false);
    const [snapshots, setSnapshots] = useState<ExamSnapshot[]>([]);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [faceDetected, setFaceDetected] = useState(true);

    // Initial model loading
    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = '/models';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
                console.log('FaceAPI models loaded');
            } catch (err) {
                console.error('Error loading face-api models:', err);
            }
        };
        loadModels();
    }, []);

    // Capture snapshots and perform face detection every 5 seconds
    useEffect(() => {
        if (!hasStarted || finished || !videoRef.current || !modelsLoaded) return;

        const captureAndDetect = async () => {
            const video = videoRef.current;
            if (!video || video.videoWidth === 0) return;

            // Perform Face Detection
            const detections = await faceapi.detectSingleFace(
                video,
                new faceapi.TinyFaceDetectorOptions()
            ).withFaceLandmarks();

            setFaceDetected(!!detections);

            const canvas = document.createElement('canvas');
            const scale = Math.min(320 / video.videoWidth, 240 / video.videoHeight, 1);
            canvas.width = video.videoWidth * scale;
            canvas.height = video.videoHeight * scale;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Draw landmarks on the snapshot if detected
                if (detections) {
                    const resizedDetections = faceapi.resizeResults(detections, { width: canvas.width, height: canvas.height });
                    // Optional: we can manually draw simple lines for eyes in the snapshot to prove tracking
                    // faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
                }

                const dataUrl = canvas.toDataURL('image/jpeg', 0.4);

                const snapshot: ExamSnapshot = {
                    timestamp: new Date().toISOString(),
                    image: dataUrl,
                    violation: !detections ? 'Лицо не обнаружено' : undefined
                };

                setSnapshots(prev => [...prev, snapshot]);

                updateLiveStream({
                    studentId,
                    quizId: quiz.id,
                    snapshot: dataUrl,
                    timestamp: Date.now(),
                    faceDetected: !!detections
                }).catch(console.error);
            }
        };

        const initDelay = setTimeout(captureAndDetect, 2000);
        const intervalId = setInterval(captureAndDetect, 5000); // Faster interval for tracking

        return () => {
            clearTimeout(initDelay);
            clearInterval(intervalId);
        };
    }, [hasStarted, finished, studentId, quiz.id, modelsLoaded]);

    // Timer run only AFTER started
    useEffect(() => {
        if (finished || !hasStarted) return;
        if (timeLeft <= 0) {
            handleFinish();
            return;
        }
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, finished, hasStarted]);

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const PENALTY_SECONDS = 10 * 60; // 10 minutes penalty

    // Anti-cheat & Fullscreen Setup
    useEffect(() => {
        if (!hasStarted || finished) return;

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                // Apply -10 min penalty
                setTimeLeft(prev => {
                    const newTime = prev - PENALTY_SECONDS;
                    if (newTime <= 0) {
                        setTimeout(() => handleFinish(), 0);
                        return 0;
                    }
                    return newTime;
                });
                setViolationCount(prev => prev + 1);
                setShowViolationOverlay(true);
            } else {
                setShowViolationOverlay(false);
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Student switched tab / minimized — apply -10 min penalty
                setTimeLeft(prev => {
                    const newTime = prev - PENALTY_SECONDS;
                    if (newTime <= 0) {
                        setTimeout(() => handleFinish(), 0);
                        return 0;
                    }
                    return newTime;
                });
                alert('ВНИМАНИЕ! Вы переключились на другую вкладку/окно. Штраф: −10 минут!');
            }
        };

        const handleCopy = (e: ClipboardEvent) => {
            e.preventDefault();
            alert('Копирование текста во время экзамена запрещено!');
        };

        const handleContext = (e: MouseEvent) => {
            e.preventDefault();
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('contextmenu', handleContext);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('contextmenu', handleContext);
        };
    }, [hasStarted, finished]);

    // Clean up media stream on unmount or finish
    useEffect(() => {
        if (finished && stream) {
            stream.getTracks().forEach(track => track.stop());
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.log(err));
            }
        }
        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, [finished, stream]);

    // Attach stream to video element when it mounts
    useEffect(() => {
        if (hasStarted && stream && videoRef.current && !videoRef.current.srcObject) {
            videoRef.current.srcObject = stream;
        }
    }, [hasStarted, stream]);

    // Handle actually starting the test
    const handleStartExam = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            setStream(mediaStream);

            const docEl = document.documentElement;
            if (docEl.requestFullscreen) {
                await docEl.requestFullscreen();
            } else if ((docEl as any).webkitRequestFullscreen) {
                await (docEl as any).webkitRequestFullscreen();
            }

            setHasStarted(true);
        } catch (err) {
            alert('Для начала экзамена необходимо предоставить доступ к камере.');
            console.error(err);
        }
    };

    const currentQuestion = quiz.questions[currentIndex];
    const isLastQuestion = currentIndex === quiz.questions.length - 1;

    const handleAnswer = (value: string) => {
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
    };

    const handleNext = () => {
        if (isLastQuestion) {
            handleFinish();
        } else {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handleFinish = async () => {
        // Calculate score
        let score = 0;
        const maxScore = 100; // Всегда 100 — баллы распределены алгоритмом

        quiz.questions.forEach(q => {
            const pts = q.points || 0;
            const studentAnswer = (answers[q.id] || '').trim().toLowerCase();
            const correct = q.correctAnswer.trim().toLowerCase();
            if (studentAnswer === correct) {
                score += pts;
            }
        });

        const res: StudentResult = {
            id: crypto.randomUUID(),
            studentId,
            quizId: quiz.id,
            answers,
            score,
            maxScore,
            completedAt: new Date().toISOString(),
            snapshots
        };

        await addResult(res);
        await removeLiveStream(studentId);
        setResult(res);
        setFinished(true);

        // Stop camera stream
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };

    // Results view
    if (finished && result) {
        const pct = Math.round((result.score / result.maxScore) * 100);
        return (
            <div className="quiz-runner">
                <div className="quiz-result-card">
                    <div className="quiz-result-icon">
                        {pct >= 70 ? (
                            <CheckCircle size={64} className="text-green" />
                        ) : (
                            <XCircle size={64} className="text-red" />
                        )}
                    </div>
                    <h2 className="quiz-result-title">Экзамен завершён!</h2>
                    <p className="quiz-result-quiz-name">{quiz.title}</p>
                    <div className={`quiz-result-score ${pct >= 70 ? 'score-green' : pct >= 40 ? 'score-yellow' : 'score-red'}`}>
                        {pct}%
                    </div>
                    <p className="quiz-result-details">
                        Правильных ответов: {result.score} из {result.maxScore}
                    </p>

                    {/* Answer review */}
                    <div className="quiz-review">
                        {quiz.questions.map((q, i) => {
                            const studentAnswer = (answers[q.id] || '').trim().toLowerCase();
                            const correct = q.correctAnswer.trim().toLowerCase();
                            const isCorrect = studentAnswer === correct;
                            return (
                                <div key={q.id} className={`review-item ${isCorrect ? 'review-correct' : 'review-wrong'}`}>
                                    <div className="review-header">
                                        <span className="review-number">#{i + 1}</span>
                                        {isCorrect ? <CheckCircle size={16} className="text-green" /> : <XCircle size={16} className="text-red" />}
                                    </div>
                                    <p className="review-question">{q.text}</p>
                                    <div className="review-answers">
                                        <p><span className="review-label">Ваш ответ:</span> {answers[q.id] || '—'}</p>
                                        {!isCorrect && <p><span className="review-label">Правильный:</span> {q.correctAnswer}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button className="btn btn-primary btn-full" onClick={onFinish}>
                        <ArrowLeft size={16} /><span>Вернуться к экзаменам</span>
                    </button>
                </div>
            </div>
        );
    }

    // Start Screen view
    if (!hasStarted) {
        return (
            <div className="quiz-runner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                <div className="start-screen" style={{ background: 'var(--bg-card)', padding: '40px', borderRadius: '16px', boxShadow: 'var(--shadow-lg)', maxWidth: '480px', width: '100%' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '24px' }}>Прохождение экзамена</h2>

                    <div className="stats-grid stats-grid-2" style={{ marginBottom: '24px' }}>
                        <div className="stat-card stat-blue">
                            <div className="stat-value" style={{ fontSize: '18px' }}>{quiz.timeLimitMinutes || 30}</div>
                            <div className="stat-label">Минут</div>
                        </div>
                        <div className="stat-card stat-purple">
                            <div className="stat-value" style={{ fontSize: '18px' }}>{quiz.questions.length}</div>
                            <div className="stat-label">Вопросов</div>
                        </div>
                    </div>

                    <div style={{ background: 'var(--bg-page)', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Правила прохождения:</h3>
                        <ul style={{ paddingLeft: '20px', color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                            <li style={{ marginBottom: '6px' }}>Экзамен проходит в <strong>полноэкранном режиме</strong>.</li>
                            <li style={{ marginBottom: '6px' }}>Требуется <strong>веб-камера</strong> для записи процесса.</li>
                            <li style={{ marginBottom: '6px' }}>Выход из полноэкранного режима или переключение на другую вкладку — <strong>штраф −10 минут</strong>.</li>
                            <li><strong>Запрещено</strong> копировать текст или использовать правую кнопку мыши.</li>
                        </ul>
                    </div>

                    <label style={{ display: 'flex', gap: '12px', marginBottom: '28px', cursor: 'pointer', alignItems: 'flex-start' }}>
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            style={{ accentColor: 'var(--primary)', width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            Я подтверждаю согласие на обработку персональных данных и фиксацию видео во время экзамена
                        </span>
                    </label>

                    <button
                        className="btn btn-primary btn-full"
                        disabled={!agreed}
                        onClick={handleStartExam}
                        style={{ padding: '14px', fontSize: '16px' }}
                    >
                        <Video size={18} style={{ marginRight: '8px' }} />
                        <span>Начать экзамен</span>
                    </button>
                </div>
            </div>
        );
    }

    // Quiz taking view
    const progress = ((currentIndex + 1) / quiz.questions.length) * 100;

    const handleReturnFullscreen = async () => {
        const docEl = document.documentElement;
        try {
            if (docEl.requestFullscreen) {
                await docEl.requestFullscreen();
            } else if ((docEl as any).webkitRequestFullscreen) {
                await (docEl as any).webkitRequestFullscreen();
            }
            setShowViolationOverlay(false);
        } catch {
            // Fallback: hide overlay anyway
            setShowViolationOverlay(false);
        }
    };

    return (
        <div className="quiz-runner" style={{ position: 'relative' }}>
            {/* Fullscreen Violation Overlay */}
            {showViolationOverlay && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99999,
                    backgroundColor: 'rgba(10, 15, 30, 0.97)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '20px',
                    backdropFilter: 'blur(8px)',
                }}>
                    {/* Warning icon */}
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        border: '3px solid #ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '4px',
                    }}>
                        <span style={{ color: '#ef4444', fontSize: '32px', fontWeight: 700, lineHeight: 1 }}>!</span>
                    </div>

                    {/* Title */}
                    <h2 style={{
                        color: '#ef4444',
                        fontSize: '28px',
                        fontWeight: 700,
                        margin: 0,
                        textAlign: 'center',
                    }}>Нарушение режима безопасности!</h2>

                    <p style={{ color: '#94a3b8', fontSize: '16px', margin: 0 }}>
                        Вы вышли из полноэкранного режима.
                    </p>

                    {/* Violation badge */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        backgroundColor: 'rgba(234, 179, 8, 0.12)',
                        border: '1px solid rgba(234, 179, 8, 0.3)',
                        borderRadius: '12px',
                        padding: '14px 24px',
                        marginTop: '4px',
                    }}>
                        <AlertTriangle size={20} style={{ color: '#eab308' }} />
                        <div>
                            <div style={{ color: '#eab308', fontWeight: 700, fontSize: '15px' }}>
                                Нарушений: {violationCount}
                            </div>
                            <div style={{ color: '#a18827', fontSize: '13px', marginTop: '2px' }}>
                                Штраф: −10 минут от времени
                            </div>
                        </div>
                    </div>

                    <p style={{ color: '#64748b', fontSize: '14px', margin: '8px 0 0' }}>
                        Пожалуйста, вернитесь, чтобы продолжить.
                    </p>

                    {/* Return button */}
                    <button
                        onClick={handleReturnFullscreen}
                        style={{
                            marginTop: '8px',
                            padding: '14px 32px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '15px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'background-color 0.2s, transform 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#dc2626')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ef4444')}
                        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
                        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        Вернуться в полноэкранный режим
                    </button>
                </div>
            )}
            {/* Model Loading Overlay */}
            {!modelsLoaded && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 100000,
                    backgroundColor: 'var(--bg-page)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px'
                }}>
                    <div className="spinner" />
                    <p style={{ color: 'var(--text-muted)' }}>Инициализация системы прокторинга...</p>
                </div>
            )}

            {/* Floating Camera Window */}
            <div style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                width: '260px',
                height: '180px',
                backgroundColor: '#000',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2), 0 4px 10px rgba(0,0,0,0.1)',
                zIndex: 9999,
                overflow: 'hidden',
                border: faceDetected ? '2px solid var(--success)' : '2px solid var(--danger)',
                transition: 'border-color 0.3s ease'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    zIndex: 2
                }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: 'var(--danger)',
                        borderRadius: '50%',
                        animation: 'pulse 1.5s infinite alternate'
                    }} />
                    REC
                </div>

                {/* Face Tracking Status Overlay */}
                <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: faceDetected ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)',
                    backdropFilter: 'blur(4px)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 700,
                    zIndex: 2,
                    transition: 'background-color 0.3s'
                }}>
                    {faceDetected ? <UserCheck size={12} /> : <Eye size={12} />}
                    {faceDetected ? 'В кадре' : 'Нет лица'}
                </div>

                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                />
            </div>

            {/* Header */}
            <div className="quiz-runner-header">
                <div className="quiz-runner-info">
                    <h2 className="quiz-runner-title">{quiz.title}</h2>
                    <span className="quiz-runner-progress-text">
                        Вопрос {currentIndex + 1} из {quiz.questions.length}
                    </span>
                </div>
                <div className={`quiz-timer ${timeLeft < 60 ? 'timer-danger' : timeLeft < 300 ? 'timer-warning' : ''}`}>
                    <Clock size={16} />
                    <span>{formatTime(timeLeft)}</span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="quiz-progress-bar">
                <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
            </div>

            {/* Question */}
            <div className="quiz-question-card">
                <h3 className="quiz-question-text">{currentQuestion.text}</h3>

                {currentQuestion.type === 'choice' && currentQuestion.options ? (
                    <div className="quiz-options">
                        {currentQuestion.options.map((opt, i) => (
                            <label
                                key={i}
                                className={`quiz-option ${answers[currentQuestion.id] === opt ? 'quiz-option-selected' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name={`q-${currentQuestion.id}`}
                                    value={opt}
                                    checked={answers[currentQuestion.id] === opt}
                                    onChange={() => handleAnswer(opt)}
                                    className="sr-only"
                                />
                                <span className="quiz-option-marker">{String.fromCharCode(65 + i)}</span>
                                <span>{opt}</span>
                            </label>
                        ))}
                    </div>
                ) : (
                    <textarea
                        className="quiz-text-answer"
                        placeholder="Введите ваш ответ..."
                        value={answers[currentQuestion.id] || ''}
                        onChange={e => handleAnswer(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                            }
                        }}
                        rows={8}
                        autoFocus
                    />
                )}
            </div>

            {/* Navigation */}
            <div className="quiz-nav">
                <button
                    className="btn btn-primary"
                    onClick={handleNext}
                    disabled={!answers[currentQuestion.id]?.trim()}
                >
                    {isLastQuestion ? (
                        <><CheckCircle size={16} /><span>Завершить экзамен</span></>
                    ) : (
                        <><span>Следующий вопрос</span><ChevronRight size={16} /></>
                    )}
                </button>
            </div>
        </div>
    );
};

export default QuizRunner;
