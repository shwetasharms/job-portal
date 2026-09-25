/**
 * Curated keyword dictionary used to detect skills in job descriptions
 * and resumes. `aliases` are matched case-insensitively on word boundaries
 * and all resolve to `term`. Extend freely – order does not matter.
 */
export type KeywordCategory = "skill" | "tool" | "soft" | "domain";

export interface DictEntry {
  term: string;
  /** Case-insensitive alternate spellings */
  aliases?: string[];
  /** Short/ambiguous forms that must match with exact casing (e.g. "Go", "ML") */
  caseSensitive?: string[];
  /** When false, `term` itself is only matched via `caseSensitive` (default true) */
  matchTermLoosely?: boolean;
  category: KeywordCategory;
}

export const DICTIONARY: DictEntry[] = [
  // Languages
  { term: "JavaScript", aliases: ["ecmascript", "es6"], caseSensitive: ["JS"], category: "skill" },
  { term: "TypeScript", caseSensitive: ["TS"], category: "skill" },
  { term: "Python", category: "skill" },
  { term: "Java", category: "skill" },
  { term: "Kotlin", category: "skill" },
  { term: "Swift", category: "skill" },
  { term: "Go", aliases: ["golang"], caseSensitive: ["Go"], matchTermLoosely: false, category: "skill" },
  { term: "Rust", category: "skill" },
  { term: "C++", aliases: ["cpp"], category: "skill" },
  { term: "C#", aliases: ["csharp", "c sharp"], category: "skill" },
  { term: "PHP", category: "skill" },
  { term: "Ruby", category: "skill" },
  { term: "Scala", category: "skill" },
  { term: "R", aliases: ["r programming", "rstudio"], caseSensitive: ["R"], matchTermLoosely: false, category: "skill" },
  { term: "SQL", category: "skill" },
  { term: "HTML", aliases: ["html5"], category: "skill" },
  { term: "CSS", aliases: ["css3"], category: "skill" },
  { term: "Sass", aliases: ["scss"], category: "skill" },
  { term: "Bash", aliases: ["shell scripting", "shell script"], category: "skill" },
  { term: "DAX", category: "skill" },

  // Frontend
  { term: "React", aliases: ["react.js", "reactjs", "react js"], category: "skill" },
  { term: "Next.js", aliases: ["nextjs", "next js"], category: "skill" },
  { term: "Angular", aliases: ["angularjs", "angular.js"], category: "skill" },
  { term: "Vue.js", aliases: ["vue", "vuejs", "vue js"], category: "skill" },
  { term: "Svelte", category: "skill" },
  { term: "Redux", aliases: ["redux toolkit", "rtk"], category: "skill" },
  { term: "React Query", aliases: ["tanstack query", "react-query"], category: "skill" },
  { term: "Tailwind CSS", aliases: ["tailwind", "tailwindcss"], category: "tool" },
  { term: "Bootstrap", category: "tool" },
  { term: "Material UI", aliases: ["mui", "material-ui"], category: "tool" },
  { term: "Webpack", category: "tool" },
  { term: "Vite", category: "tool" },
  { term: "D3.js", aliases: ["d3", "d3js"], category: "tool" },
  { term: "Recharts", category: "tool" },
  { term: "React Native", category: "skill" },
  { term: "Flutter", category: "skill" },
  { term: "Responsive Design", aliases: ["responsive web design", "mobile-first"], category: "skill" },
  { term: "Server-Side Rendering", aliases: ["ssr", "server side rendering"], category: "skill" },
  { term: "Accessibility", aliases: ["a11y", "wcag"], category: "skill" },

  // Backend
  { term: "Node.js", aliases: ["nodejs", "node js", "node"], category: "skill" },
  { term: "Express", aliases: ["express.js", "expressjs"], category: "skill" },
  { term: "NestJS", aliases: ["nest.js"], category: "skill" },
  { term: "Django", category: "skill" },
  { term: "Flask", category: "skill" },
  { term: "FastAPI", category: "skill" },
  { term: "Spring Boot", aliases: ["springboot", "spring framework"], caseSensitive: ["Spring"], category: "skill" },
  { term: "Laravel", category: "skill" },
  { term: ".NET", aliases: ["dotnet", "asp.net"], category: "skill" },
  { term: "REST API", aliases: ["rest api", "rest apis", "restful", "restful apis", "restful services"], caseSensitive: ["REST"], matchTermLoosely: false, category: "skill" },
  { term: "GraphQL", category: "skill" },
  { term: "gRPC", category: "skill" },
  { term: "Microservices", aliases: ["microservice", "micro-services"], category: "skill" },
  { term: "WebSockets", aliases: ["websocket", "socket.io"], category: "skill" },
  { term: "API Security", aliases: ["oauth", "jwt", "owasp"], category: "skill" },
  { term: "Kafka", aliases: ["apache kafka"], category: "tool" },
  { term: "RabbitMQ", category: "tool" },
  { term: "Message Queues", aliases: ["message queue", "bullmq", "sqs", "job queues", "queues"], category: "tool" },
  { term: "System Design", aliases: ["system architecture", "software architecture"], category: "skill" },

  // Data stores
  { term: "PostgreSQL", aliases: ["postgres", "psql"], category: "tool" },
  { term: "MySQL", category: "tool" },
  { term: "MongoDB", aliases: ["mongo"], category: "tool" },
  { term: "Redis", category: "tool" },
  { term: "Elasticsearch", aliases: ["elastic search", "opensearch"], category: "tool" },
  { term: "BigQuery", aliases: ["big query"], category: "tool" },
  { term: "Snowflake", category: "tool" },
  { term: "DynamoDB", category: "tool" },
  { term: "Vector Database", aliases: ["vector db", "pinecone", "weaviate", "faiss", "chroma", "pgvector"], category: "tool" },

  // Cloud / DevOps
  { term: "AWS", aliases: ["amazon web services", "ec2", "aws lambda", "sagemaker"], category: "tool" },
  { term: "GCP", aliases: ["google cloud", "google cloud platform"], category: "tool" },
  { term: "Azure", aliases: ["microsoft azure"], category: "tool" },
  { term: "Docker", aliases: ["containerization", "containerisation", "docker compose"], category: "tool" },
  { term: "Kubernetes", aliases: ["k8s", "eks", "gke", "aks"], category: "tool" },
  { term: "Terraform", aliases: ["infrastructure as code", "iac"], category: "tool" },
  { term: "CI/CD", aliases: ["ci cd", "continuous integration", "continuous deployment", "github actions", "jenkins", "gitlab ci"], category: "tool" },
  { term: "Linux", aliases: ["unix", "ubuntu"], category: "tool" },
  { term: "Git", aliases: ["github", "gitlab", "bitbucket"], category: "tool" },
  { term: "Prometheus", category: "tool" },
  { term: "Grafana", category: "tool" },
  { term: "Nginx", category: "tool" },

  // Testing
  { term: "Jest", category: "tool" },
  { term: "React Testing Library", aliases: ["testing library"], category: "tool" },
  { term: "Cypress", category: "tool" },
  { term: "Playwright", category: "tool" },
  { term: "Unit Testing", aliases: ["unit tests", "tdd", "test-driven"], category: "skill" },

  // Data / ML
  { term: "Machine Learning", caseSensitive: ["ML"], category: "skill" },
  { term: "Deep Learning", category: "skill" },
  { term: "NLP", aliases: ["natural language processing"], category: "skill" },
  { term: "Computer Vision", aliases: ["opencv"], category: "skill" },
  { term: "LLM", aliases: ["llms", "large language model", "large language models", "gpt", "openai"], category: "skill" },
  { term: "RAG", aliases: ["retrieval augmented generation", "retrieval-augmented generation"], category: "skill" },
  { term: "Prompt Engineering", category: "skill" },
  { term: "Embeddings", aliases: ["embedding"], category: "skill" },
  { term: "LangChain", category: "tool" },
  { term: "Hugging Face", aliases: ["huggingface", "transformers"], category: "tool" },
  { term: "PyTorch", category: "tool" },
  { term: "TensorFlow", aliases: ["keras"], category: "tool" },
  { term: "scikit-learn", aliases: ["sklearn", "scikit learn"], category: "tool" },
  { term: "Pandas", category: "tool" },
  { term: "NumPy", category: "tool" },
  { term: "MLOps", aliases: ["model monitoring", "mlflow"], category: "skill" },
  { term: "Statistics", aliases: ["statistical analysis", "hypothesis testing"], category: "skill" },
  { term: "A/B Testing", aliases: ["ab testing", "a/b tests", "experimentation"], category: "skill" },
  { term: "Data Visualization", aliases: ["data visualisation", "dashboards", "dashboard"], category: "skill" },
  { term: "ETL", aliases: ["data pipeline", "data pipelines", "elt"], category: "skill" },
  { term: "Airflow", aliases: ["apache airflow"], category: "tool" },
  { term: "Spark", aliases: ["pyspark", "apache spark"], category: "tool" },
  { term: "Power BI", aliases: ["powerbi"], category: "tool" },
  { term: "Tableau", category: "tool" },
  { term: "Looker Studio", aliases: ["data studio", "looker"], category: "tool" },
  { term: "Excel", aliases: ["ms excel", "microsoft excel", "advanced excel", "vlookup", "pivot tables"], category: "tool" },
  { term: "Web Scraping", aliases: ["scraping", "scrapy", "beautifulsoup", "puppeteer"], category: "skill" },

  // Marketing
  { term: "SEO", aliases: ["search engine optimization", "search engine optimisation"], category: "skill" },
  { term: "Google Ads", aliases: ["adwords", "google adwords"], caseSensitive: ["SEM"], category: "tool" },
  { term: "Meta Ads", aliases: ["facebook ads", "instagram ads"], category: "tool" },
  { term: "Google Analytics", aliases: ["ga4", "google analytics 4", "universal analytics"], category: "tool" },
  { term: "Social Media Marketing", aliases: ["social media", "smm"], category: "skill" },
  { term: "Content Marketing", aliases: ["content strategy", "content calendar", "content calendars"], category: "skill" },
  { term: "Copywriting", aliases: ["copy writing", "ad copy"], category: "skill" },
  { term: "Email Marketing", aliases: ["mailchimp", "email campaigns"], category: "skill" },
  { term: "Performance Marketing", category: "skill" },

  // Process / soft
  { term: "Agile", aliases: ["scrum", "kanban"], category: "soft" },
  { term: "Communication", aliases: ["communication skills", "written english", "verbal communication"], category: "soft" },
  { term: "Stakeholder Management", aliases: ["stakeholders", "client communication", "client-facing"], category: "soft" },
  { term: "Leadership", aliases: ["team lead", "led a team", "leading teams"], category: "soft" },
  { term: "Mentoring", aliases: ["mentor", "mentored", "coaching"], category: "soft" },
  { term: "Code Review", aliases: ["code reviews", "pull requests", "pr reviews"], category: "soft" },
  { term: "Problem Solving", aliases: ["problem-solving", "analytical skills"], category: "soft" },
  { term: "Performance Optimization", aliases: ["performance optimisation", "optimise rendering", "optimize rendering", "web vitals"], category: "skill" },
];
