# Resume Matcher & Assignment Evaluator v2

Rule-based resume parsing, job matching, and assignment bonus point evaluation.
No LLMs. No external APIs. Runs fully offline.

---

## What It Does

- **Parses resumes** (PDF, DOCX, TXT) — extracts name, email, phone, years of experience, skills
- **Parses job descriptions** — extracts role, salary, required experience, skills
- **Matches resume to JDs** — produces per-skill analysis and matching score (0–100%)
- **Evaluates bonus points** — detects API, Database, UI, and Docker in submitted assignments
- **Stores all results** — SQLite database, viewable in the UI submissions tab
- **Full web UI** — browser-based, no frontend build step needed

---

## Bonus Points Logic

Each category is worth 1 bonus point (= +5 to final score):

| Category             | What It Detects                                              |
|----------------------|--------------------------------------------------------------|
| API Implementation   | express, fetch, axios, @app.route, /api/, swagger, etc.      |
| Database Integration | mongoose, sequelize, prisma, sqlite3, pg, SELECT, INSERT, etc.|
| UI Implementation    | react, angular, vue, <html>, useState, tailwind, etc.         |
| Docker Support       | Dockerfile, FROM, docker-compose, EXPOSE, CMD, etc.          |

**Final Score = Base Match Score + (Bonus Points × 5)**

---

## Project Structure

```
resume-matcher/
├── src/
│   ├── server.js           Express API + static file server
│   ├── bonusEvaluator.js   Bonus point detection (API / DB / UI / Docker)
│   ├── database.js         SQLite layer (better-sqlite3)
│   ├── resumeParser.js     Name, email, phone, experience extraction
│   ├── jdParser.js         Job title, salary, skills extraction
│   ├── skillsExtractor.js  Skill detection with section awareness
│   ├── skillsDictionary.js 100+ skills with aliases
│   ├── matcher.js          Score calculation and job ranking
│   └── textExtractor.js    PDF / DOCX / TXT reader
├── public/
│   └── index.html          Full web UI (no build step)
├── data/                   SQLite database (auto-created)
├── uploads/                Temp file storage (auto-cleaned)
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## Option 1 — Run Locally (Node.js)

### Step 1: Check Node version

```bash
node --version
```

You need Node.js 18 or higher. Download from https://nodejs.org if needed.

### Step 2: Go into the project folder

```bash
cd resume-matcher
```

### Step 3: Install dependencies

```bash
npm install
```

This installs: express, multer, pdf-parse, mammoth, better-sqlite3, cors.

> If better-sqlite3 fails to compile, run:
> ```bash
> npm install --build-from-source better-sqlite3
> ```
> You need Python 3 and build tools (make, g++) installed.

### Step 4: Start the server

```bash
npm start
```

You should see:

```
Resume Matcher v2 running on http://localhost:3000
```

### Step 5: Open the UI

Open your browser and go to:

```
http://localhost:3000
```

---

## Option 2 — Run with Docker (Recommended)

### Step 1: Check Docker is installed

```bash
docker --version
docker compose version
```

Download Docker Desktop from https://www.docker.com/products/docker-desktop if needed.

### Step 2: Go into the project folder

```bash
cd resume-matcher
```

### Step 3: Build and start

```bash
docker compose up --build
```

First run will take 1–2 minutes to download and build. After that it starts in seconds.

### Step 4: Open the UI

```
http://localhost:3000
```

### Step 5: Stop the server

```bash
docker compose down
```

### Useful Docker commands

```bash
# Run in background
docker compose up -d --build

# View logs
docker compose logs -f

# Restart
docker compose restart

# Remove container and volumes
docker compose down -v
```

---

## API Endpoints

### GET /health
Returns server status.

### POST /api/parse-resume
Upload resume file. Field name: `resume`

```bash
curl -X POST http://localhost:3000/api/parse-resume \
  -F "resume=@resume.pdf"
```

### POST /api/parse-jd
Parse a job description from text.

```bash
curl -X POST http://localhost:3000/api/parse-jd \
  -H "Content-Type: application/json" \
  -d '{"text": "We need a Python developer with 3+ years...", "jobId": "JD001"}'
```

### POST /api/evaluate-bonus
Evaluate bonus points from a file or text.

```bash
# From file
curl -X POST http://localhost:3000/api/evaluate-bonus \
  -F "submission=@project.pdf"

# From text
curl -X POST http://localhost:3000/api/evaluate-bonus \
  -H "Content-Type: application/json" \
  -d '{"text": "Built with Express.js, MongoDB, React, Docker..."}'
```

### POST /api/match
Match resume to JDs and optionally evaluate bonus.

```bash
curl -X POST http://localhost:3000/api/match \
  -F "resume=@resume.pdf" \
  -F "submission=@project_readme.txt" \
  -F 'jds=[{"jobId":"JD001","text":"Python developer, Docker, REST API..."}]'
```

### GET /api/submissions
Get all saved submissions.

### GET /api/submissions/:id
Get one submission with full job matches.

### DELETE /api/submissions/:id
Delete a submission.

---

## Example Match Response

```json
{
  "success": true,
  "data": {
    "submissionId": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "yearOfExperience": 4.5,
    "resumeSkills": ["python", "docker", "react", "postgresql"],
    "baseScore": 75.0,
    "finalScore": 95.0,
    "bonusEvaluation": {
      "bonusPoints": {
        "apiImplementation":   { "awarded": true,  "confidence": "high",   "signalHits": 8  },
        "databaseIntegration": { "awarded": true,  "confidence": "high",   "signalHits": 6  },
        "uiImplementation":    { "awarded": true,  "confidence": "medium", "signalHits": 4  },
        "dockerSupport":       { "awarded": true,  "confidence": "high",   "signalHits": 5  }
      },
      "totalBonusPoints": 4,
      "maxBonusPoints": 4,
      "bonusSummary": "✔ API  ✔ Database  ✔ UI  ✔ Docker"
    },
    "matchingJobs": [
      {
        "jobId": "JD001",
        "role": "Backend Developer",
        "matchingScore": 75.0,
        "skillsAnalysis": [
          { "skill": "python", "presentInResume": true },
          { "skill": "docker", "presentInResume": true },
          { "skill": "kafka",  "presentInResume": false }
        ]
      }
    ]
  }
}
```

---

## Troubleshooting

**better-sqlite3 compile error on npm install**
```bash
npm install --build-from-source better-sqlite3
```
Or use Docker instead — it handles all native dependencies automatically.

**Port 3000 already in use**
Change the port:
```bash
PORT=4000 npm start
```
Or in docker-compose.yml change `"3000:3000"` to `"4000:3000"`.

**PDF text extraction returns empty**
Some PDFs are scanned images. The system can only extract text from selectable PDFs.
Convert your PDF to text first using an OCR tool.

**File too large error**
Maximum file size is 10MB. Reduce your file size before uploading.