const SKILLS_DICTIONARY = [
  "javascript", "typescript", "python", "java", "c++", "c#", "c", "go", "rust",
  "ruby", "php", "swift", "kotlin", "scala", "r", "matlab", "fortran", "bash",
  "shell", "perl", "groovy", "dart", "elixir", "haskell", "lua",

  "react", "angular", "vue", "angularjs", "nextjs", "nuxtjs", "svelte",
  "jquery", "html", "css", "sass", "less", "tailwind", "bootstrap", "webpack",
  "vite", "gatsby", "remix", "redux", "mobx", "graphql", "rest", "restful",

  "node.js", "nodejs", "express", "fastapi", "django", "flask", "spring",
  "spring boot", "springboot", "laravel", "rails", "asp.net", ".net", "dotnet",
  "hibernate", "kafka", "rabbitmq", "celery", "grpc", "websocket",

  "mysql", "postgresql", "mongodb", "redis", "sqlite", "oracle", "mssql",
  "sql server", "dynamodb", "cassandra", "elasticsearch", "neo4j", "db2",
  "mariadb", "firebase", "supabase",

  "docker", "kubernetes", "aws", "azure", "gcp", "terraform", "ansible",
  "jenkins", "github actions", "gitlab ci", "ci/cd", "linux", "unix",
  "nginx", "apache", "helm", "istio", "prometheus", "grafana", "kibana",
  "logstash", "elk", "chef", "puppet",

  "git", "svn", "jira", "confluence", "agile", "scrum", "kanban", "sdlc",
  "tdd", "bdd", "unit testing", "pytest", "junit", "selenium", "cypress",
  "postman", "swagger", "openapi",

  "machine learning", "deep learning", "ai", "ml", "tensorflow", "pytorch",
  "scikit-learn", "pandas", "numpy", "opencv", "nlp", "computer vision",

  "microservices", "mpi", "openmp", "fpga", "embedded", "rtos", "cuda",
  "gpu", "hpc", "protobuf", "yaml", "json", "xml", "oauth", "jwt",

  "react native", "flutter", "android", "ios", "xamarin",

  "hadoop", "spark", "airflow", "dbt", "snowflake", "bigquery", "tableau",
  "power bi", "looker",

  "c/c++", "full stack", "fullstack", "backend", "frontend", "devops",
  "devsecops", "sre", "postgresql", "typescript", "ui/ux"
];

const SKILL_ALIASES = {
  "node.js": ["nodejs", "node js"],
  "spring boot": ["springboot", "spring-boot"],
  "react": ["reactjs", "react.js"],
  "angular": ["angularjs", "angular.js"],
  "vue": ["vuejs", "vue.js"],
  "c++": ["cpp", "c plus plus"],
  "c#": ["csharp", "c sharp"],
  ".net": ["dotnet", "asp.net"],
  "machine learning": ["ml"],
  "artificial intelligence": ["ai"],
  "postgresql": ["postgres"],
  "mongodb": ["mongo"],
  "elasticsearch": ["elastic search"],
  "kubernetes": ["k8s"],
  "javascript": ["js"],
  "typescript": ["ts"],
  "python": ["py"],
  "ci/cd": ["cicd", "ci cd"],
  "rest": ["restful", "rest api"],
  "sql server": ["mssql", "microsoft sql server"],
};

module.exports = { SKILLS_DICTIONARY, SKILL_ALIASES };