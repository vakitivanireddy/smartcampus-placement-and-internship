const { query, withTransaction } = require('../db/pool');
const { parseResumePdf, safeFilename } = require('../services/resumeService');
const { badRequest, notFound } = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

function parseExtracted(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function serializeResume(row) {
  if (!row) return null;
  return {
    id: row.id,
    original_filename: row.original_filename,
    mime_type: row.mime_type,
    file_size: row.file_size,
    status: row.status,
    error_message: row.error_message,
    extracted_text: row.extracted_text,
    extracted_data: parseExtracted(row.extracted_data),
    created_at: row.created_at,
  };
}

const upload = asyncHandler(async (req, res) => {
  if (!req.file) throw badRequest('Choose a PDF resume to upload.');

  const catalogue = await query('SELECT id, name, category FROM skills ORDER BY name');
  const filename = safeFilename(req.file.originalname);
  let parsed;
  try {
    parsed = await parseResumePdf(req.file.buffer, catalogue);
  } catch (error) {
    const failed = await query(
      `INSERT INTO resumes (user_id, original_filename, mime_type, file_size, status, error_message)
       VALUES (?, ?, ?, ?, 'failed', ?)`,
      [req.user.id, filename, req.file.mimetype, req.file.size, String(error.message).slice(0, 500)],
    );
    const httpError = badRequest(
      `${error.message} You can add skills manually from your profile if extraction is not possible.`,
    );
    httpError.details = [{ field: 'resume', message: error.message }];
    throw httpError;
  }

  const result = await query(
    `INSERT INTO resumes (user_id, original_filename, mime_type, file_size, extracted_text, extracted_data, status)
     VALUES (?, ?, ?, ?, ?, ?, 'processed')`,
    [
      req.user.id,
      filename,
      req.file.mimetype,
      req.file.size,
      parsed.text,
      JSON.stringify(parsed.extracted),
    ],
  );

  const catalogueMap = new Map(catalogue.map((skill) => [skill.name, skill]));
  const suggestions = parsed.extracted.skills.map((name) => ({
    name,
    category: catalogueMap.get(name)?.category || 'concept',
    skill_id: catalogueMap.get(name)?.id || null,
    proficiency: 3,
  }));

  const rows = await query('SELECT * FROM resumes WHERE id = ? AND user_id = ?', [result.insertId, req.user.id]);
  res.status(201).json({
    data: { resume: serializeResume(rows[0]), suggestions },
    message: 'Resume processed. Review the extracted skills and information before importing.',
  });
});

const list = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT id, original_filename, mime_type, file_size, status, error_message, extracted_data, created_at
     FROM resumes WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
    [req.user.id],
  );
  res.json({
    data: rows.map((row) => ({ ...serializeResume(row), extracted_text: undefined })),
    meta: {
      privacy: 'PDF files are processed in memory and are not stored on the server. Extracted text and confirmed skills are stored so you can review them.',
    },
  });
});

const getOne = asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM resumes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!rows[0]) throw notFound('Resume not found.');
  res.json({ data: serializeResume(rows[0]) });
});

const remove = asyncHandler(async (req, res) => {
  await query('DELETE FROM resumes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ message: 'Resume record deleted.' });
});

const importSkills = asyncHandler(async (req, res) => {
  const resumeRows = await query('SELECT id FROM resumes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!resumeRows[0]) throw notFound('Resume not found.');

  let imported = 0;
  await withTransaction(async (connection) => {
    for (const skill of req.body.skills) {
      let skillId = skill.skill_id;
      if (!skillId) {
        const [existing] = await connection.execute('SELECT id FROM skills WHERE LOWER(name) = LOWER(?) LIMIT 1', [skill.name]);
        if (existing[0]) {
          skillId = existing[0].id;
        } else {
          const [created] = await connection.execute("INSERT INTO skills (name, category) VALUES (?, 'concept')", [skill.name]);
          skillId = created.insertId;
        }
      }
      await connection.execute(
        `INSERT INTO student_skills (user_id, skill_id, proficiency, source, is_confirmed)
         VALUES (?, ?, ?, 'resume', 1)
         ON DUPLICATE KEY UPDATE proficiency = VALUES(proficiency), is_confirmed = 1`,
        [req.user.id, skillId, skill.proficiency],
      );
      imported += 1;
    }
  });

  res.json({ message: `${imported} skill${imported === 1 ? '' : 's'} imported. You can adjust proficiency on your profile.`, meta: { imported } });
});

module.exports = { upload, list, getOne, remove, importSkills };
