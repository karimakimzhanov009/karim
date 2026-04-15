import { User, Quiz, StudentResult, Group } from './types';

const KEYS = {
    users: 'ithub_users',
    quizzes: 'ithub_quizzes',
    results: 'ithub_results',
    live_streams: 'ithub_live_streams',
    groups: 'ithub_groups',
};

// ─── Helpers ─────────────────────────────────────────────

function read<T>(key: string): T[] {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function write<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
}

// ─── Seed default admin ──────────────────────────────────

export function seedAdmin(): void {
    const users = read<User>(KEYS.users);
    if (!users.find(u => u.role === 'admin')) {
        users.push({
            id: 'admin-001',
            username: 'admin',
            password: 'admin123',
            role: 'admin',
            fullName: 'Администратор',
            createdAt: new Date().toISOString(),
        });
        write(KEYS.users, users);
    }
}

// ─── Users ───────────────────────────────────────────────

export function getUsers(): User[] {
    return read<User>(KEYS.users);
}

export function getUserById(id: string): User | undefined {
    return getUsers().find(u => u.id === id);
}

export function getUserByUsername(username: string): User | undefined {
    return getUsers().find(u => u.username === username);
}

export function addUser(user: User): void {
    const users = getUsers();
    if (users.find(u => u.username === user.username)) {
        throw new Error('Пользователь с таким логином уже существует');
    }
    users.push(user);
    write(KEYS.users, users);
}

export function updateUser(user: User): void {
    const users = getUsers().map(u => u.id === user.id ? user : u);
    write(KEYS.users, users);
}

export function deleteUser(id: string): void {
    const allUsers = getUsers();

    // Find all users created by this user (e.g. students created by this teacher)
    const usersToDelete = new Set([id]);
    allUsers.forEach(u => {
        if (u.createdBy === id) {
            usersToDelete.add(u.id);
        }
    });

    const activeUsers = allUsers.filter(u => !usersToDelete.has(u.id));
    write(KEYS.users, activeUsers);

    // Also remove related quizzes created by this user
    const quizzes = getQuizzes().filter(q => q.createdBy !== id);
    write(KEYS.quizzes, quizzes);

    // Remove results where the student was deleted
    const results = getResults().filter(r => !usersToDelete.has(r.studentId));
    write(KEYS.results, results);

    // Remove deleted students from all groups
    const groups = getGroups().map(g => ({
        ...g,
        studentIds: g.studentIds.filter(sid => !usersToDelete.has(sid)),
    }));
    write(KEYS.groups, groups);
}

export function getTeachers(): User[] {
    return getUsers().filter(u => u.role === 'teacher');
}

// ─── Groups ──────────────────────────────────────────────

export function getGroups(): Group[] {
    return read<Group>(KEYS.groups);
}

export function getGroupsByTeacher(teacherId: string): Group[] {
    return getGroups().filter(g => g.createdBy === teacherId);
}

export function addGroup(group: Group): void {
    const groups = getGroups();
    groups.push(group);
    write(KEYS.groups, groups);
}

export function updateGroup(group: Group): void {
    const groups = getGroups().map(g => g.id === group.id ? group : g);
    write(KEYS.groups, groups);
}

export function deleteGroup(id: string): void {
    const groups = getGroups().filter(g => g.id !== id);
    write(KEYS.groups, groups);
}

export function getStudentsByTeacher(teacherId: string): User[] {
    return getUsers().filter(u => u.role === 'student' && u.createdBy === teacherId);
}

// ─── Quizzes ─────────────────────────────────────────────

export function getQuizzes(): Quiz[] {
    return read<Quiz>(KEYS.quizzes);
}

export function getQuizById(id: string): Quiz | undefined {
    return getQuizzes().find(q => q.id === id);
}

export function getQuizzesByTeacher(teacherId: string): Quiz[] {
    return getQuizzes().filter(q => q.createdBy === teacherId);
}

export function getQuizzesForStudent(studentId: string): Quiz[] {
    const studentGroups = getGroups().filter(g => g.studentIds.includes(studentId)).map(g => g.id);
    return getQuizzes().filter(q =>
        q.assignedTo.includes(studentId) ||
        (q.assignedGroups && q.assignedGroups.some(gid => studentGroups.includes(gid)))
    );
}

export function addQuiz(quiz: Quiz): void {
    const quizzes = getQuizzes();
    quizzes.push(quiz);
    write(KEYS.quizzes, quizzes);
}

export function updateQuiz(quiz: Quiz): void {
    const quizzes = getQuizzes().map(q => q.id === quiz.id ? quiz : q);
    write(KEYS.quizzes, quizzes);
}

export function deleteQuiz(id: string): void {
    const quizzes = getQuizzes().filter(q => q.id !== id);
    write(KEYS.quizzes, quizzes);
    const results = getResults().filter(r => r.quizId !== id);
    write(KEYS.results, results);
}

// ─── Results ─────────────────────────────────────────────

export function getResults(): StudentResult[] {
    return read<StudentResult>(KEYS.results);
}

export function getResultsByStudent(studentId: string): StudentResult[] {
    return getResults().filter(r => r.studentId === studentId);
}

export function getResultsByQuiz(quizId: string): StudentResult[] {
    return getResults().filter(r => r.quizId === quizId);
}

export function addResult(result: StudentResult): void {
    const results = getResults();
    results.push(result);
    write(KEYS.results, results);
}

export function hasStudentCompletedQuiz(studentId: string, quizId: string): boolean {
    return getResults().some(r => r.studentId === studentId && r.quizId === quizId);
}

// ─── Live Streams (Simulated) ────────────────────────────

export function getLiveStreams(): import('./types').LiveStreamFeed[] {
    return read<import('./types').LiveStreamFeed>(KEYS.live_streams);
}

export function updateLiveStream(feed: import('./types').LiveStreamFeed): void {
    const streams = getLiveStreams();
    const existingIndex = streams.findIndex(s => s.studentId === feed.studentId);
    if (existingIndex >= 0) {
        streams[existingIndex] = feed;
    } else {
        streams.push(feed);
    }

    // Cleanup old streams (older than 2 minutes)
    const activeStreams = streams.filter(s => Date.now() - s.timestamp < 120_000);
    write(KEYS.live_streams, activeStreams);
}

export function removeLiveStream(studentId: string): void {
    const streams = getLiveStreams().filter(s => s.studentId !== studentId);
    write(KEYS.live_streams, streams);
}
