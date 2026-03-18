const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const { extractTextFromFile, cleanText } = require("./textExtractor");
const { parseResume } = require("./resumeParser");
const { parseJD } = require("./jdParser");
const { matchResumeToJDs } = require("./matcher");
const { evaluateBonusPoints } = require("./bonusEvaluator");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.static(path.join(__dirname, "../public")));

const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = [".pdf", ".docx", ".txt"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, DOCX, and TXT files are supported."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

function cleanupFile(filePath) {
  if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

app.get("/health", (req, res) => {
  res.json({ status: "ok", version: "2.0.0", timestamp: new Date().toISOString() });
});

app.post("/api/parse-resume", upload.single("resume"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No resume file uploaded. Use field name 'resume'." });
  }
  const filePath = req.file.path;
  try {
    const raw = await extractTextFromFile(filePath);
    const parsed = parseResume(cleanText(raw));
    cleanupFile(filePath);
    res.json({
      success: true,
      data: {
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        yearOfExperience: parsed.yearOfExperience,
        resumeSkills: parsed.resumeSkills
      }
    });
  } catch (err) {
    cleanupFile(filePath);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/parse-jd", (req, res) => {
  const { text, jobId } = req.body;
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ success: false, error: "Body must have a non-empty 'text' field." });
  }
  try {
    res.json({ success: true, data: parseJD(cleanText(text), jobId) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/evaluate-bonus", upload.single("submission"), async (req, res) => {
  let text = "";
  let filePath = null;

  if (req.file) {
    filePath = req.file.path;
    try {
      const raw = await extractTextFromFile(filePath);
      text = cleanText(raw);
    } catch (err) {
      cleanupFile(filePath);
      return res.status(500).json({ success: false, error: "Could not read file: " + err.message });
    }
    cleanupFile(filePath);
  } else if (req.body && req.body.text) {
    text = req.body.text;
  } else {
    return res.status(400).json({
      success: false,
      error: "Send either a file (field: 'submission') or a JSON body with 'text' field."
    });
  }

  try {
    const result = evaluateBonusPoints(text);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/match", upload.fields([
  { name: "resume", maxCount: 1 },
  { name: "submission", maxCount: 1 }
]), async (req, res) => {
  const resumeFile = req.files && req.files["resume"] && req.files["resume"][0];
  const submissionFile = req.files && req.files["submission"] && req.files["submission"][0];

  if (!resumeFile) {
    return res.status(400).json({ success: false, error: "No resume uploaded. Use field name 'resume'." });
  }

  let jds = [];
  try {
    if (req.body.jds) {
      jds = JSON.parse(req.body.jds);
      if (!Array.isArray(jds)) throw new Error("'jds' must be a JSON array.");
    }
  } catch (err) {
    cleanupFile(resumeFile.path);
    if (submissionFile) cleanupFile(submissionFile.path);
    return res.status(400).json({ success: false, error: "Invalid 'jds' JSON: " + err.message });
  }

  try {
    const resumeRaw = await extractTextFromFile(resumeFile.path);
    const parsedResume = parseResume(cleanText(resumeRaw));
    cleanupFile(resumeFile.path);

    const parsedJDs = jds.map((jd, i) => {
      if (!jd.text || typeof jd.text !== "string") {
        throw new Error("JD at index " + i + " must have a 'text' field.");
      }
      return parseJD(cleanText(jd.text), jd.jobId || ("JD00" + (i + 1)));
    });

    const matchingJobs = matchResumeToJDs(parsedResume, parsedJDs);
    const topScore = matchingJobs.length > 0 ? matchingJobs[0].matchingScore : 0;

    let bonusData = null;
    let submissionText = "";

    if (submissionFile) {
      const subRaw = await extractTextFromFile(submissionFile.path);
      submissionText = cleanText(subRaw);
      cleanupFile(submissionFile.path);
      bonusData = evaluateBonusPoints(submissionText);
    } else if (req.body.submissionText) {
      submissionText = req.body.submissionText;
      bonusData = evaluateBonusPoints(submissionText);
    }

    const submissionId = db.saveSubmission(parsedResume);

    const emptyBonus = {
      bonusPoints: {
        apiImplementation:   { awarded: false },
        databaseIntegration: { awarded: false },
        uiImplementation:    { awarded: false },
        dockerSupport:       { awarded: false }
      },
      totalBonusPoints: 0,
      bonusSummary: "No submission provided"
    };

    db.saveEvaluation(submissionId, topScore, bonusData || emptyBonus);

    if (matchingJobs.length > 0) {
      db.saveJobMatches(submissionId, matchingJobs);
    }

    const finalScore = bonusData
      ? Math.min(100, topScore + bonusData.totalBonusPoints * 5)
      : topScore;

    res.json({
      success: true,
      data: {
        submissionId,
        name: parsedResume.name,
        email: parsedResume.email,
        phone: parsedResume.phone,
        yearOfExperience: parsedResume.yearOfExperience,
        resumeSkills: parsedResume.resumeSkills,
        matchingJobs: matchingJobs.map(job => ({
          jobId: job.jobId,
          role: job.role,
          aboutRole: job.aboutRole,
          salary: job.salary,
          experienceRequired: job.experienceRequired,
          skillsAnalysis: job.skillsAnalysis,
          matchingScore: job.matchingScore
        })),
        bonusEvaluation: bonusData,
        baseScore: topScore,
        finalScore
      }
    });

  } catch (err) {
    cleanupFile(resumeFile && resumeFile.path);
    if (submissionFile) cleanupFile(submissionFile.path);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/submissions", (req, res) => {
  try {
    const rows = db.getAllSubmissions();
    const data = rows.map(r => ({
      ...r,
      skills: JSON.parse(r.skills || "[]")
    }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/submissions/:id", (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid submission ID." });

  try {
    const submission = db.getSubmissionById(id);
    if (!submission) return res.status(404).json({ success: false, error: "Submission not found." });
    res.json({ success: true, data: submission });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/submissions/:id", (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid submission ID." });

  try {
    const deleted = db.deleteSubmission(id);
    if (!deleted) return res.status(404).json({ success: false, error: "Submission not found." });
    res.json({ success: true, message: "Submission deleted." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, error: "File too large. Max 10MB." });
    }
    return res.status(400).json({ success: false, error: "Upload error: " + err.message });
  }
  if (err) return res.status(400).json({ success: false, error: err.message });
  next();
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: "Not found: " + req.method + " " + req.path });
});

app.listen(PORT, () => {
  console.log("Resume Matcher v2 running on http://localhost:" + PORT);
});

module.exports = app;