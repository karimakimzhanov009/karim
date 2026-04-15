import { supabase } from './supabase';
import { User, Quiz, StudentResult, Group } from './types';

// ─── Row mappers ──────────────────────────────────────────

function mapUser(row: any): User {
    return {
        id: row.id,
        username: row.username,
        password: row.password,
        role: row.role,
        fullName: row.full_name,
        createdBy: row.created_by ?? undefined,
        createdAt: row.created_at,
    };
}

function mapGroup(row: any): Group {
    return {
        id: row.id,
        name: row.name,
        createdBy: row.created_by,
        studentIds: row.student_ids ?? [],
        createdAt: row.created_at,
    };
}

function mapQuiz(row: any): Quiz {
    return {
        id: row.id,
        title: row.title,
        description: row.description ?? undefined,
        createdBy: row.created_by,
        assignedTo: row.assigned_to ?? [],
        assignedGroups: row.assigned_groups ?? [],
        questions: row.questions ?? [],
        timeLimitMinutes: row.time_limit_minutes ?? undefined,
        scheduledAt: row.scheduled_at ?? undefined,
        createdAt: row.created_at,
    };
}

function mapResult(row: any): StudentResult {
    return {
        id: row.id,
        studentId: row.student_id,
        quizId: row.quiz_id,
        answers: row.answers ?? {},
        score: row.score,
        maxScore: row.max_score,
        completedAt: row.completed_at,
        snapshots: row.snapshots ?? [],
    };
}

// ─── Seed default admin ──────────────────────────────────

export async function seedAdmin(): Promise<void> {
    const { data } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .single();

    if (!data) {
        await supabase.from('users').insert({
            id: 'admin-001',
            username: 'admin',
            password: 'admin123',
            role: 'admin',
            full_name: 'Администратор',
            created_by: null,
            created_at: new Date().toISOString(),
        });
    }
}

// ─── Users ───────────────────────────────────────────────

export async function getUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*');
    if (error) { console.error(error); return []; }
    return (data ?? []).map(mapUser);
}

export async function getUserById(id: string): Promise<User | undefined> {
    const { data } = await supabase.from('users').select('*').eq('id', id).single();
    return data ? mapUser(data) : undefined;
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
    const { data } = await supabase.from('users').select('*').eq('username', username).single();
    return data ? mapUser(data) : undefined;
}

export async function addUser(user: User): Promise<void> {
    const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', user.username)
        .single();
    if (existing) throw new Error('Пользователь с таким логином уже существует');

    const { error } = await supabase.from('users').insert({
        id: user.id,
        username: user.username,
        password: user.password,
        role: user.role,
        full_name: user.fullName,
        created_by: user.createdBy ?? null,
        created_at: user.createdAt,
    });
    if (error) throw new Error(error.message);
}

export async function updateUser(user: User): Promise<void> {
    await supabase.from('users').update({
        username: user.username,
        password: user.password,
        role: user.role,
        full_name: user.fullName,
        created_by: user.createdBy ?? null,
    }).eq('id', user.id);
}

export async function deleteUser(id: string): Promise<void> {
    // Find users created by this user
    const { data: children } = await supabase
        .from('users')
        .select('id')
        .eq('created_by', id);

    const idsToDelete = [id, ...(children ?? []).map((u: any) => u.id)];

    await supabase.from('users').delete().in('id', idsToDelete);
    await supabase.from('quizzes').delete().eq('created_by', id);
    await supabase.from('student_results').delete().in('student_id', idsToDelete);

    // Remove deleted students from groups
    const { data: groups } = await supabase.from('groups').select('*');
    for (const g of groups ?? []) {
        const filtered = (g.student_ids ?? []).filter((sid: string) => !idsToDelete.includes(sid));
        await supabase.from('groups').update({ student_ids: filtered }).eq('id', g.id);
    }
}

export async function getTeachers(): Promise<User[]> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'teacher');
    if (error) return [];
    return (data ?? []).map(mapUser);
}

// ─── Groups ──────────────────────────────────────────────

export async function getGroups(): Promise<Group[]> {
    const { data, error } = await supabase.from('groups').select('*');
    if (error) return [];
    return (data ?? []).map(mapGroup);
}

export async function getGroupsByTeacher(teacherId: string): Promise<Group[]> {
    const { data } = await supabase.from('groups').select('*').eq('created_by', teacherId);
    return (data ?? []).map(mapGroup);
}

export async function addGroup(group: Group): Promise<void> {
    await supabase.from('groups').insert({
        id: group.id,
        name: group.name,
        created_by: group.createdBy,
        student_ids: group.studentIds,
        created_at: group.createdAt,
    });
}

export async function updateGroup(group: Group): Promise<void> {
    await supabase.from('groups').update({
        name: group.name,
        student_ids: group.studentIds,
    }).eq('id', group.id);
}

export async function deleteGroup(id: string): Promise<void> {
    await supabase.from('groups').delete().eq('id', id);
}

export async function getStudentsByTeacher(teacherId: string): Promise<User[]> {
    const { data } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'student')
        .eq('created_by', teacherId);
    return (data ?? []).map(mapUser);
}

// ─── Quizzes ─────────────────────────────────────────────

export async function getQuizzes(): Promise<Quiz[]> {
    const { data, error } = await supabase.from('quizzes').select('*');
    if (error) return [];
    return (data ?? []).map(mapQuiz);
}

export async function getQuizById(id: string): Promise<Quiz | undefined> {
    const { data } = await supabase.from('quizzes').select('*').eq('id', id).single();
    return data ? mapQuiz(data) : undefined;
}

export async function getQuizzesByTeacher(teacherId: string): Promise<Quiz[]> {
    const { data } = await supabase.from('quizzes').select('*').eq('created_by', teacherId);
    return (data ?? []).map(mapQuiz);
}

export async function getQuizzesForStudent(studentId: string): Promise<Quiz[]> {
    const { data: groupData } = await supabase
        .from('groups')
        .select('id, student_ids');
    const studentGroups = (groupData ?? [])
        .filter((g: any) => (g.student_ids ?? []).includes(studentId))
        .map((g: any) => g.id);

    const { data } = await supabase.from('quizzes').select('*');
    return (data ?? [])
        .filter((q: any) =>
            (q.assigned_to ?? []).includes(studentId) ||
            (q.assigned_groups ?? []).some((gid: string) => studentGroups.includes(gid))
        )
        .map(mapQuiz);
}

export async function addQuiz(quiz: Quiz): Promise<void> {
    const { error } = await supabase.from('quizzes').insert({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description ?? null,
        created_by: quiz.createdBy,
        assigned_to: quiz.assignedTo,
        assigned_groups: quiz.assignedGroups,
        questions: quiz.questions,
        time_limit_minutes: quiz.timeLimitMinutes ?? null,
        scheduled_at: quiz.scheduledAt ?? null,
        created_at: quiz.createdAt,
    });
    if (error) throw new Error(error.message);
}

export async function updateQuiz(quiz: Quiz): Promise<void> {
    await supabase.from('quizzes').update({
        title: quiz.title,
        description: quiz.description ?? null,
        assigned_to: quiz.assignedTo,
        assigned_groups: quiz.assignedGroups,
        questions: quiz.questions,
        time_limit_minutes: quiz.timeLimitMinutes ?? null,
        scheduled_at: quiz.scheduledAt ?? null,
    }).eq('id', quiz.id);
}

export async function deleteQuiz(id: string): Promise<void> {
    await supabase.from('quizzes').delete().eq('id', id);
    await supabase.from('student_results').delete().eq('quiz_id', id);
}

// ─── Results ─────────────────────────────────────────────

export async function getResults(): Promise<StudentResult[]> {
    const { data, error } = await supabase.from('student_results').select('*');
    if (error) return [];
    return (data ?? []).map(mapResult);
}

export async function getResultsByStudent(studentId: string): Promise<StudentResult[]> {
    const { data } = await supabase.from('student_results').select('*').eq('student_id', studentId);
    return (data ?? []).map(mapResult);
}

export async function getResultsByQuiz(quizId: string): Promise<StudentResult[]> {
    const { data } = await supabase.from('student_results').select('*').eq('quiz_id', quizId);
    return (data ?? []).map(mapResult);
}

export async function addResult(result: StudentResult): Promise<void> {
    await supabase.from('student_results').insert({
        id: result.id,
        student_id: result.studentId,
        quiz_id: result.quizId,
        answers: result.answers,
        score: result.score,
        max_score: result.maxScore,
        completed_at: result.completedAt,
        snapshots: result.snapshots ?? [],
    });
}

export async function hasStudentCompletedQuiz(studentId: string, quizId: string): Promise<boolean> {
    const { data } = await supabase
        .from('student_results')
        .select('id')
        .eq('student_id', studentId)
        .eq('quiz_id', quizId)
        .limit(1);
    return (data ?? []).length > 0;
}

// ─── Live Streams ────────────────────────────────────────

export async function getLiveStreams(): Promise<import('./types').LiveStreamFeed[]> {
    const cutoff = Date.now() - 120_000;
    const { data } = await supabase
        .from('live_streams')
        .select('*')
        .gt('timestamp', cutoff);
    return (data ?? []).map((s: any) => ({
        studentId: s.student_id,
        quizId: s.quiz_id,
        snapshot: s.snapshot,
        timestamp: s.timestamp,
        faceDetected: s.face_detected,
    }));
}

export async function updateLiveStream(feed: import('./types').LiveStreamFeed): Promise<void> {
    await supabase.from('live_streams').upsert({
        student_id: feed.studentId,
        quiz_id: feed.quizId,
        snapshot: feed.snapshot,
        timestamp: feed.timestamp,
        face_detected: feed.faceDetected ?? null,
    }, { onConflict: 'student_id' });

    // Cleanup stale
    const cutoff = Date.now() - 120_000;
    await supabase.from('live_streams').delete().lt('timestamp', cutoff);
}

export async function removeLiveStream(studentId: string): Promise<void> {
    await supabase.from('live_streams').delete().eq('student_id', studentId);
}
