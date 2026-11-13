const { query, pool } = require('../db/pool');
const { badRequest, notFound } = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

const CATEGORY_META = [
  { key: 'quantitative', label: 'Quantitative Aptitude', description: 'Arithmetic, percentages, averages, time-speed-distance and more.' },
  { key: 'logical', label: 'Logical Reasoning', description: 'Series, coding-decoding, puzzles, directions and analytical reasoning.' },
  { key: 'verbal', label: 'Verbal Ability', description: 'Grammar, vocabulary, idioms, sentence correction and comprehension.' },
];
const CATEGORY_KEYS = CATEGORY_META.map((item) => item.key);

function parseOptions(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : Object.values(parsed || {});
  } catch {
    return [];
  }
}

function publicQuestion(row) {
  return {
    id: row.id,
    category: row.category,
    difficulty: row.difficulty,
    prompt: row.prompt,
    options: parseOptions(row.options),
  };
}

function attemptTitle(row) {
  if (row.mode === 'mock') return row.mock_title || 'Mock test';
  return CATEGORY_META.find((item) => item.key === row.category)?.label || 'Mixed aptitude practice';
}

function normaliseAttempt(row) {
  return {
    ...row,
    total_questions: Number(row.total_questions || 0),
    correct_answers: Number(row.correct_answers || 0),
    score_percent: Number(row.score_percent || 0),
    time_spent_seconds: Number(row.time_spent_seconds || 0),
    title: attemptTitle(row),
  };
}

const getOverview = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const [statsRows, categoryRows, tests, recentAttempts] = await Promise.all([
    query(
      `SELECT
         COUNT(*) AS attempts_total,
         SUM(mode = 'mock') AS mock_attempts,
         SUM(mode = 'aptitude') AS aptitude_attempts,
         COALESCE(AVG(score_percent), 0) AS average_score,
         COALESCE(MAX(score_percent), 0) AS best_score
       FROM practice_attempts WHERE user_id = ?`,
      [userId],
    ),
    query(
      `SELECT q.category,
              COUNT(DISTINCT q.id) AS total,
              COUNT(DISTINCT ua.question_id) AS attempted,
              COALESCE(SUM(ua.is_correct = 1), 0) AS correct
       FROM practice_questions q
       LEFT JOIN (
         SELECT aa.question_id, aa.is_correct
         FROM practice_attempt_answers aa
         JOIN practice_attempts pa ON pa.id = aa.attempt_id
         WHERE pa.user_id = ?
       ) ua ON ua.question_id = q.id
       WHERE q.is_active = 1
       GROUP BY q.category`,
      [userId],
    ),
    query(
      `SELECT mt.id, mt.slug, mt.title, mt.description, mt.duration_minutes,
              (SELECT COUNT(*) FROM mock_test_questions mtq WHERE mtq.mock_test_id = mt.id) AS question_count,
              (SELECT COUNT(*) FROM practice_attempts pa WHERE pa.mock_test_id = mt.id AND pa.user_id = ?) AS attempts,
              (SELECT MAX(pa.score_percent) FROM practice_attempts pa WHERE pa.mock_test_id = mt.id AND pa.user_id = ?) AS best_score,
              (SELECT MAX(pa.submitted_at) FROM practice_attempts pa WHERE pa.mock_test_id = mt.id AND pa.user_id = ?) AS last_attempted_at
       FROM mock_tests mt
       WHERE mt.is_active = 1
       ORDER BY mt.id`,
      [userId, userId, userId],
    ),
    query(
      `SELECT pa.id, pa.mode, pa.category, pa.total_questions, pa.correct_answers, pa.score_percent,
              pa.time_spent_seconds, pa.submitted_at, mt.slug AS mock_slug, mt.title AS mock_title
       FROM practice_attempts pa
       LEFT JOIN mock_tests mt ON mt.id = pa.mock_test_id
       WHERE pa.user_id = ?
       ORDER BY pa.submitted_at DESC, pa.id DESC
       LIMIT 6`,
      [userId],
    ),
  ]);

  const answerRows = await query(
    `SELECT COUNT(*) AS questions_answered
     FROM practice_attempt_answers aa
     JOIN practice_attempts pa ON pa.id = aa.attempt_id
     WHERE pa.user_id = ? AND aa.selected_option IS NOT NULL`,
    [userId],
  );

  const stats = statsRows[0] || {};
  const categoryMap = new Map(categoryRows.map((row) => [row.category, row]));

  res.json({
    data: {
      stats: {
        attempts_total: Number(stats.attempts_total || 0),
        mock_attempts: Number(stats.mock_attempts || 0),
        aptitude_attempts: Number(stats.aptitude_attempts || 0),
        average_score: Math.round(Number(stats.average_score || 0)),
        best_score: Math.round(Number(stats.best_score || 0)),
        questions_answered: Number(answerRows[0]?.questions_answered || 0),
      },
      categories: CATEGORY_META.map((meta) => {
        const row = categoryMap.get(meta.key) || {};
        const attempted = Number(row.attempted || 0);
        const correct = Number(row.correct || 0);
        return {
          ...meta,
          total: Number(row.total || 0),
          attempted,
          correct,
          accuracy: attempted ? Math.round((correct / attempted) * 100) : 0,
        };
      }),
      mock_tests: tests.map((test) => ({
        ...test,
        question_count: Number(test.question_count || 0),
        attempts: Number(test.attempts || 0),
        best_score: test.best_score === null ? null : Math.round(Number(test.best_score)),
      })),
      recent_attempts: recentAttempts.map(normaliseAttempt),
    },
  });
});

const listAptitudeQuestions = asyncHandler(async (req, res) => {
  const category = String(req.query.category || 'mixed');
  if (category !== 'mixed' && !CATEGORY_KEYS.includes(category)) {
    throw badRequest('Choose a valid aptitude category.');
  }
  const limit = Math.max(5, Math.min(25, Number(req.query.limit) || 10));
  const params = [];
  const clauses = ['is_active = 1'];
  if (category !== 'mixed') {
    clauses.push('category = ?');
    params.push(category);
  }
  const countRows = await query(`SELECT COUNT(*) AS total FROM practice_questions WHERE ${clauses.join(' AND ')}`, params);
  const rows = await query(
    `SELECT id, category, difficulty, prompt, options
     FROM practice_questions
     WHERE ${clauses.join(' AND ')}
     ORDER BY RAND()
     LIMIT ${limit}`,
    params,
  );
  res.json({
    data: rows.map(publicQuestion),
    meta: {
      category,
      requested: limit,
      total_available: Number(countRows[0]?.total || 0),
    },
  });
});

async function loadQuestionMap(questionIds) {
  if (!questionIds.length) return new Map();
  const placeholders = questionIds.map(() => '?').join(', ');
  const rows = await query(
    `SELECT id, category, prompt, options, correct_option, explanation
     FROM practice_questions
     WHERE id IN (${placeholders}) AND is_active = 1`,
    questionIds,
  );
  return new Map(rows.map((row) => [Number(row.id), row]));
}

function buildAnswerRows(questionIds, questionMap, answers) {
  const selectedByQuestion = new Map();
  for (const answer of answers) {
    const questionId = Number(answer.question_id);
    if (questionMap.has(questionId)) {
      selectedByQuestion.set(questionId, answer.selected_option);
    }
  }
  return questionIds.map((questionId) => {
    const question = questionMap.get(questionId);
    const selected = selectedByQuestion.has(Number(questionId)) ? selectedByQuestion.get(Number(questionId)) : null;
    const isCorrect = selected !== null && selected !== undefined && Number(selected) === Number(question.correct_option);
    return { questionId: Number(questionId), selected: selected === null || selected === undefined ? null : Number(selected), isCorrect };
  });
}

async function saveAttempt({ userId, mode, mockTestId = null, category = null, answerRows, timeSpentSeconds }) {
  const total = answerRows.length;
  const correct = answerRows.filter((answer) => answer.isCorrect).length;
  const score = total ? Math.round((correct / total) * 10000) / 100 : 0;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO practice_attempts
       (user_id, mode, mock_test_id, category, total_questions, correct_answers, score_percent, time_spent_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, mode, mockTestId, category, total, correct, score, timeSpentSeconds],
    );
    for (const answer of answerRows) {
      await connection.execute(
        `INSERT INTO practice_attempt_answers (attempt_id, question_id, selected_option, is_correct)
         VALUES (?, ?, ?, ?)`,
        [result.insertId, answer.questionId, answer.selected, answer.isCorrect ? 1 : 0],
      );
    }
    await connection.commit();
    return result.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

const submitAptitude = asyncHandler(async (req, res) => {
  const { answers, category = null, time_spent_seconds: timeSpentSeconds = 0 } = req.body;
  if (category !== null && !CATEGORY_KEYS.includes(category)) {
    throw badRequest('Choose a valid aptitude category.');
  }
  const questionIds = [...new Set(answers.map((answer) => Number(answer.question_id)))];
  const questionMap = await loadQuestionMap(questionIds);
  if (questionMap.size !== questionIds.length) {
    throw badRequest('One or more questions in this attempt are no longer available.');
  }
  if (category) {
    const invalid = [...questionMap.values()].some((question) => question.category !== category);
    if (invalid) throw badRequest('The attempt contains questions outside the selected category.');
  }
  const answerRows = buildAnswerRows(questionIds, questionMap, answers);
  const attemptId = await saveAttempt({
    userId: req.user.id,
    mode: 'aptitude',
    category,
    answerRows,
    timeSpentSeconds,
  });
  res.status(201).json({ data: { id: attemptId }, message: 'Practice attempt submitted.' });
});

const listMockTests = asyncHandler(async (req, res) => {
  const tests = await query(
    `SELECT mt.id, mt.slug, mt.title, mt.description, mt.duration_minutes,
            (SELECT COUNT(*) FROM mock_test_questions mtq WHERE mtq.mock_test_id = mt.id) AS question_count,
            (SELECT COUNT(*) FROM practice_attempts pa WHERE pa.mock_test_id = mt.id AND pa.user_id = ?) AS attempts,
            (SELECT MAX(pa.score_percent) FROM practice_attempts pa WHERE pa.mock_test_id = mt.id AND pa.user_id = ?) AS best_score
     FROM mock_tests mt
     WHERE mt.is_active = 1
     ORDER BY mt.id`,
    [req.user.id, req.user.id],
  );
  res.json({
    data: tests.map((test) => ({
      ...test,
      question_count: Number(test.question_count || 0),
      attempts: Number(test.attempts || 0),
      best_score: test.best_score === null ? null : Math.round(Number(test.best_score)),
    })),
  });
});

const getMockTest = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT id, slug, title, description, duration_minutes
     FROM mock_tests WHERE slug = ? AND is_active = 1 LIMIT 1`,
    [req.params.slug],
  );
  if (!rows[0]) throw notFound('Mock test not found.');
  const test = rows[0];
  const questions = await query(
    `SELECT q.id, q.category, q.difficulty, q.prompt, q.options
     FROM mock_test_questions mtq
     JOIN practice_questions q ON q.id = mtq.question_id
     WHERE mtq.mock_test_id = ? AND q.is_active = 1
     ORDER BY mtq.sort_order, mtq.id`,
    [test.id],
  );
  res.json({
    data: {
      ...test,
      questions: questions.map(publicQuestion),
    },
  });
});

const submitMockTest = asyncHandler(async (req, res) => {
  const { answers, time_spent_seconds: timeSpentSeconds = 0 } = req.body;
  const rows = await query(
    `SELECT id, slug, title FROM mock_tests WHERE slug = ? AND is_active = 1 LIMIT 1`,
    [req.params.slug],
  );
  if (!rows[0]) throw notFound('Mock test not found.');
  const test = rows[0];
  const testQuestions = await query(
    `SELECT q.id
     FROM mock_test_questions mtq
     JOIN practice_questions q ON q.id = mtq.question_id
     WHERE mtq.mock_test_id = ? AND q.is_active = 1
     ORDER BY mtq.sort_order, mtq.id`,
    [test.id],
  );
  if (!testQuestions.length) throw badRequest('This mock test does not have any questions yet.');
  const questionIds = testQuestions.map((row) => Number(row.id));
  const questionMap = await loadQuestionMap(questionIds);
  const answerRows = buildAnswerRows(questionIds, questionMap, answers);
  const attemptId = await saveAttempt({
    userId: req.user.id,
    mode: 'mock',
    mockTestId: test.id,
    answerRows,
    timeSpentSeconds,
  });
  res.status(201).json({
    data: { id: attemptId, slug: test.slug, title: test.title },
    message: 'Mock test submitted.',
  });
});

const listAttempts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const [rows, countRows] = await Promise.all([
    query(
      `SELECT pa.id, pa.mode, pa.category, pa.total_questions, pa.correct_answers, pa.score_percent,
              pa.time_spent_seconds, pa.submitted_at, mt.slug AS mock_slug, mt.title AS mock_title
       FROM practice_attempts pa
       LEFT JOIN mock_tests mt ON mt.id = pa.mock_test_id
       WHERE pa.user_id = ?
       ORDER BY pa.submitted_at DESC, pa.id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [req.user.id],
    ),
    query('SELECT COUNT(*) AS total FROM practice_attempts WHERE user_id = ?', [req.user.id]),
  ]);
  res.json({
    data: rows.map(normaliseAttempt),
    pagination: {
      page,
      limit,
      total: Number(countRows[0]?.total || 0),
      pages: Math.ceil(Number(countRows[0]?.total || 0) / limit),
    },
  });
});

const getAttempt = asyncHandler(async (req, res) => {
  const attemptRows = await query(
    `SELECT pa.id, pa.mode, pa.category, pa.total_questions, pa.correct_answers, pa.score_percent,
            pa.time_spent_seconds, pa.submitted_at, mt.slug AS mock_slug, mt.title AS mock_title
     FROM practice_attempts pa
     LEFT JOIN mock_tests mt ON mt.id = pa.mock_test_id
     WHERE pa.id = ? AND pa.user_id = ? LIMIT 1`,
    [req.params.id, req.user.id],
  );
  if (!attemptRows[0]) throw notFound('Practice attempt not found.');
  const attempt = normaliseAttempt(attemptRows[0]);
  const answerRows = await query(
    `SELECT aa.question_id, aa.selected_option, aa.is_correct,
            q.category, q.difficulty, q.prompt, q.options, q.correct_option, q.explanation
     FROM practice_attempt_answers aa
     JOIN practice_questions q ON q.id = aa.question_id
     WHERE aa.attempt_id = ?
     ORDER BY aa.id`,
    [attempt.id],
  );
  res.json({
    data: {
      ...attempt,
      answers: answerRows.map((row) => ({
        question_id: row.question_id,
        category: row.category,
        difficulty: row.difficulty,
        prompt: row.prompt,
        options: parseOptions(row.options),
        selected_option: row.selected_option === null ? null : Number(row.selected_option),
        correct_option: Number(row.correct_option),
        is_correct: Boolean(row.is_correct),
        explanation: row.explanation,
      })),
    },
  });
});

module.exports = {
  getOverview,
  listAptitudeQuestions,
  submitAptitude,
  listMockTests,
  getMockTest,
  submitMockTest,
  listAttempts,
  getAttempt,
};
