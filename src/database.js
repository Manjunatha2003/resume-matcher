const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_DIR = path.join(__dirname, "../data");
const DB_PATH = path.join(DB_DIR, "resume_matcher.db");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT,
    email       TEXT,
    phone       TEXT,
    experience  REAL,
    skills      TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS evaluations (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id         INTEGER,
    base_score            REAL,
    bonus_api             INTEGER DEFAULT 0,
    bonus_db              INTEGER DEFAULT 0,
    bonus_ui              INTEGER DEFAULT 0,
    bonus_docker          INTEGER DEFAULT 0,
    total_bonus           INTEGER DEFAULT 0,
    bonus_summary         TEXT,
    final_score           REAL,
    created_at            TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (submission_id) REFERENCES submissions(id)
  );

  CREATE TABLE IF NOT EXISTS job_matches (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id     INTEGER,
    job_id            TEXT,
    role              TEXT,
    salary            TEXT,
    experience_req    TEXT,
    matching_score    REAL,
    skills_analysis   TEXT,
    created_at        TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (submission_id) REFERENCES submissions(id)
  );
`);

function saveSubmission(parsed) {
  const stmt = db.prepare(`
    INSERT INTO submissions (name, email, phone, experience, skills)
    VALUES (@name, @email, @phone, @experience, @skills)
  `);

  const result = stmt.run({
    name: parsed.name || "Unknown",
    email: parsed.email || null,
    phone: parsed.phone || null,
    experience: parsed.yearOfExperience || null,
    skills: JSON.stringify(parsed.resumeSkills || [])
  });

  return result.lastInsertRowid;
}

function saveEvaluation(submissionId, baseScore, bonusData) {
  const stmt = db.prepare(`
    INSERT INTO evaluations
      (submission_id, base_score, bonus_api, bonus_db, bonus_ui, bonus_docker, total_bonus, bonus_summary, final_score)
    VALUES
      (@submission_id, @base_score, @bonus_api, @bonus_db, @bonus_ui, @bonus_docker, @total_bonus, @bonus_summary, @final_score)
  `);

  const finalScore = Math.min(100, parseFloat(baseScore) + (bonusData.totalBonusPoints * 5));

  const result = stmt.run({
    submission_id: submissionId,
    base_score: baseScore,
    bonus_api:    bonusData.bonusPoints.apiImplementation.awarded ? 1 : 0,
    bonus_db:     bonusData.bonusPoints.databaseIntegration.awarded ? 1 : 0,
    bonus_ui:     bonusData.bonusPoints.uiImplementation.awarded ? 1 : 0,
    bonus_docker: bonusData.bonusPoints.dockerSupport.awarded ? 1 : 0,
    total_bonus:  bonusData.totalBonusPoints,
    bonus_summary: bonusData.bonusSummary,
    final_score: finalScore
  });

  return result.lastInsertRowid;
}

function saveJobMatches(submissionId, matchingJobs) {
  const stmt = db.prepare(`
    INSERT INTO job_matches (submission_id, job_id, role, salary, experience_req, matching_score, skills_analysis)
    VALUES (@submission_id, @job_id, @role, @salary, @experience_req, @matching_score, @skills_analysis)
  `);

  const insertMany = db.transaction((jobs) => {
    for (const job of jobs) {
      stmt.run({
        submission_id: submissionId,
        job_id: job.jobId,
        role: job.role,
        salary: job.salary || null,
        experience_req: job.experienceRequired != null ? String(job.experienceRequired) : null,
        matching_score: job.matchingScore,
        skills_analysis: JSON.stringify(job.skillsAnalysis)
      });
    }
  });

  insertMany(matchingJobs);
}

function getAllSubmissions() {
  return db.prepare(`
    SELECT
      s.id, s.name, s.email, s.phone, s.experience, s.skills, s.created_at,
      e.base_score, e.bonus_api, e.bonus_db, e.bonus_ui, e.bonus_docker,
      e.total_bonus, e.bonus_summary, e.final_score
    FROM submissions s
    LEFT JOIN evaluations e ON e.submission_id = s.id
    ORDER BY s.created_at DESC
  `).all();
}

function getSubmissionById(id) {
  const submission = db.prepare(`
    SELECT
      s.id, s.name, s.email, s.phone, s.experience, s.skills, s.created_at,
      e.base_score, e.bonus_api, e.bonus_db, e.bonus_ui, e.bonus_docker,
      e.total_bonus, e.bonus_summary, e.final_score
    FROM submissions s
    LEFT JOIN evaluations e ON e.submission_id = s.id
    WHERE s.id = ?
  `).get(id);

  if (!submission) return null;

  const matches = db.prepare(`
    SELECT job_id, role, salary, experience_req, matching_score, skills_analysis
    FROM job_matches WHERE submission_id = ? ORDER BY matching_score DESC
  `).all(id);

  submission.skills = JSON.parse(submission.skills || "[]");
  submission.jobMatches = matches.map(m => ({
    ...m,
    skillsAnalysis: JSON.parse(m.skills_analysis || "[]")
  }));

  return submission;
}

function deleteSubmission(id) {
  const info = db.prepare("DELETE FROM submissions WHERE id = ?").run(id);
  return info.changes > 0;
}

module.exports = {
  saveSubmission,
  saveEvaluation,
  saveJobMatches,
  getAllSubmissions,
  getSubmissionById,
  deleteSubmission
};