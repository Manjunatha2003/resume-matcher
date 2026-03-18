const API_SIGNALS = [
  "express", "fastapi", "flask", "django", "app.get(", "app.post(", "app.put(", "app.delete(",
  "router.get", "router.post", "fetch(", "axios", "http.get", "requests.get", "requests.post",
  "restful", "rest api", "api endpoint", "swagger", "openapi", "postman", "@app.route",
  "@router", "app.listen", "createserver", "http.createserver", "httpserver",
  "multer", "cors(", "express()", "router =", "bodyparser", "body-parser",
  "/api/", "api_router", "include_router", "urlpatterns", "path('api", "route('/"
];

const DB_SIGNALS = [
  "mongoose", "sequelize", "typeorm", "prisma", "knex", "objection",
  "sqlite3", "better-sqlite3", "mysql2", "pg ", "mongodb", "mongoose.connect",
  "createconnection", "pool.query", "db.query", "collection.find", "model.find",
  "database.execute", "cursor.execute", "session.query", "repository.save",
  "entity manager", "sqlalchemy", "peewee", "tortoise", "databases",
  "createtable", "create table", "insert into", "select * from", "db.run(",
  "db.all(", "schema(", "schema.create", ".migrate", ".sync({", "db.collection",
  "redis.set", "redis.get", "dynamodb", "firestore", "supabase.from"
];

const UI_SIGNALS = [
  "react", "angular", "vue", "svelte", "nextjs", "nuxtjs",
  "<!doctype html", "<html", "<div", "<body", "<head",
  "document.getelementbyid", "document.queryselector", "innerhtml", "addeventlistener",
  "usestate(", "useeffect(", "render(", "component", "createelement",
  "bootstrap", "tailwind", "material-ui", "@mui", "antd", "chakra",
  "tkinter", "pyqt", "wxpython", "kivy", "electron",
  "flutter", "react native", "swiftui", "jetpack compose",
  ".jsx", ".tsx", ".vue", ".html", "index.html", "app.jsx", "app.tsx"
];

const DOCKER_SIGNALS = [
  "dockerfile", "from node", "from python", "from ubuntu", "from alpine",
  "from openjdk", "from nginx", "from golang", "from ruby",
  "run npm", "run pip", "run apt", "run apk", "copy package",
  "workdir /app", "expose ", "cmd [", "entrypoint [",
  "docker-compose", "docker compose", "services:", "image:", "build:",
  "container_name", "depends_on", "volumes:", "networks:",
  "ports:", "environment:", "restart: always", "healthcheck:"
];

function countSignalHits(text, signals) {
  const lower = text.toLowerCase();
  return signals.filter(signal => lower.includes(signal.toLowerCase())).length;
}

function getMatchedSignals(text, signals) {
  const lower = text.toLowerCase();
  return signals.filter(signal => lower.includes(signal.toLowerCase()));
}

function scoreCategory(hits, thresholdLow, thresholdHigh) {
  if (hits === 0) return { awarded: false, hits };
  if (hits >= thresholdHigh) return { awarded: true, confidence: "high", hits };
  if (hits >= thresholdLow) return { awarded: true, confidence: "medium", hits };
  return { awarded: true, confidence: "low", hits };
}

function evaluateBonusPoints(text) {
  if (!text || text.trim().length === 0) {
    throw new Error("Submission text is empty.");
  }

  const apiHits    = countSignalHits(text, API_SIGNALS);
  const dbHits     = countSignalHits(text, DB_SIGNALS);
  const uiHits     = countSignalHits(text, UI_SIGNALS);
  const dockerHits = countSignalHits(text, DOCKER_SIGNALS);

  const api    = scoreCategory(apiHits, 2, 5);
  const db     = scoreCategory(dbHits, 2, 5);
  const ui     = scoreCategory(uiHits, 2, 5);
  const docker = scoreCategory(dockerHits, 1, 3);

  const totalBonusPoints =
    (api.awarded    ? 1 : 0) +
    (db.awarded     ? 1 : 0) +
    (ui.awarded     ? 1 : 0) +
    (docker.awarded ? 1 : 0);

  return {
    bonusPoints: {
      apiImplementation: {
        awarded: api.awarded,
        confidence: api.confidence || null,
        signalHits: api.hits,
        detectedSignals: getMatchedSignals(text, API_SIGNALS).slice(0, 5)
      },
      databaseIntegration: {
        awarded: db.awarded,
        confidence: db.confidence || null,
        signalHits: db.hits,
        detectedSignals: getMatchedSignals(text, DB_SIGNALS).slice(0, 5)
      },
      uiImplementation: {
        awarded: ui.awarded,
        confidence: ui.confidence || null,
        signalHits: ui.hits,
        detectedSignals: getMatchedSignals(text, UI_SIGNALS).slice(0, 5)
      },
      dockerSupport: {
        awarded: docker.awarded,
        confidence: docker.confidence || null,
        signalHits: docker.hits,
        detectedSignals: getMatchedSignals(text, DOCKER_SIGNALS).slice(0, 5)
      }
    },
    totalBonusPoints,
    maxBonusPoints: 4,
    bonusSummary:
      (api.awarded    ? "✔ API"      : "✘ API")      + "  " +
      (db.awarded     ? "✔ Database" : "✘ Database") + "  " +
      (ui.awarded     ? "✔ UI"       : "✘ UI")       + "  " +
      (docker.awarded ? "✔ Docker"   : "✘ Docker")
  };
}

module.exports = { evaluateBonusPoints };