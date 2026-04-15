import { QuizQuestion } from './types';

/**
 * Распределяет баллы между вопросами так, чтобы сумма всегда была ровно 100.
 *
 * Логика:
 * 1. Вопросы с points > 0 считаются «заполненными» (веса заданы учителем).
 * 2. Вопросы с points === 0, null или undefined — «пустые» (авто-распределение).
 * 3. Если все пустые — делим 100 поровну.
 * 4. Если часть заполнена — вычитаем их сумму из 100, остаток делим между пустыми.
 * 5. Остаток от деления (если 100 не делится нацело) добавляется по +1 первым пустым вопросам.
 *
 * @throws Error если сумма заполненных > 100 или один вопрос > 100
 */
export function distributeScoreWeights(questions: QuizQuestion[]): QuizQuestion[] {
    if (questions.length === 0) return [];

    const TOTAL = 100;

    // Разделяем на заполненные и пустые
    const filledIndices: number[] = [];
    const emptyIndices: number[] = [];

    questions.forEach((q, i) => {
        if (q.points && q.points > 0) {
            filledIndices.push(i);
        } else {
            emptyIndices.push(i);
        }
    });

    // Валидация: один вопрос не может превышать 100
    for (const idx of filledIndices) {
        if (questions[idx].points! > TOTAL) {
            throw new Error(
                `Вопрос ${idx + 1}: балл (${questions[idx].points}) не может превышать ${TOTAL}`
            );
        }
    }

    // Сумма заполненных
    const filledSum = filledIndices.reduce((sum, idx) => sum + (questions[idx].points || 0), 0);

    // Валидация: сумма заполненных не может превышать 100
    if (filledSum > TOTAL) {
        throw new Error(
            `Сумма проставленных баллов (${filledSum}) превышает ${TOTAL}`
        );
    }

    // Если все вопросы заполнены и сумма < 100 — это ошибка
    if (emptyIndices.length === 0 && filledSum !== TOTAL) {
        throw new Error(
            `Сумма всех баллов (${filledSum}) не равна ${TOTAL}. Оставьте некоторые вопросы без баллов для автоматического распределения.`
        );
    }

    // Копируем массив вопросов
    const result = questions.map(q => ({ ...q }));

    // Если все заполнены и сумма = 100, просто возвращаем
    if (emptyIndices.length === 0) {
        return result;
    }

    // Распределяем остаток между пустыми
    const remaining = TOTAL - filledSum;
    const perEmpty = Math.floor(remaining / emptyIndices.length);
    const remainder = remaining - perEmpty * emptyIndices.length;

    emptyIndices.forEach((idx, i) => {
        // Первые `remainder` вопросов получают +1
        result[idx].points = perEmpty + (i < remainder ? 1 : 0);
    });

    return result;
}

/**
 * Вычисляет сумму вручную проставленных баллов и остаток для авто-распределения.
 * Используется для отображения индикатора в UI учителя.
 */
export function getScoreSummary(questions: QuizQuestion[]): {
    filledSum: number;
    filledCount: number;
    emptyCount: number;
    remaining: number;
    isValid: boolean;
    error?: string;
} {
    const TOTAL = 100;
    let filledSum = 0;
    let filledCount = 0;
    let emptyCount = 0;

    questions.forEach(q => {
        if (q.points && q.points > 0) {
            filledSum += q.points;
            filledCount++;
        } else {
            emptyCount++;
        }
    });

    const remaining = TOTAL - filledSum;

    if (filledSum > TOTAL) {
        return { filledSum, filledCount, emptyCount, remaining, isValid: false, error: `Сумма баллов (${filledSum}) превышает ${TOTAL}` };
    }

    if (emptyCount === 0 && filledSum !== TOTAL) {
        return { filledSum, filledCount, emptyCount, remaining, isValid: false, error: `Сумма баллов (${filledSum}) не равна ${TOTAL}` };
    }

    // Проверяем что каждый отдельный балл не > 100
    for (const q of questions) {
        if (q.points && q.points > TOTAL) {
            return { filledSum, filledCount, emptyCount, remaining, isValid: false, error: `Один вопрос не может иметь более ${TOTAL} баллов` };
        }
    }

    return { filledSum, filledCount, emptyCount, remaining, isValid: true };
}
