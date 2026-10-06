# CodeShield

CodeShield is a full-stack AI-assisted practical learning and evaluation platform. The repository contains two separately served React applications and one shared Express API. Both portals use the same MongoDB database and JWT authentication service. The database is initialized empty; the application creates no sample users or records.

## Architecture and structure

```text
work/
├── backend/                 Express + TypeScript API, Mongoose, Socket.IO
│   └── src/
│       ├── app.ts            Security middleware and API mounting
│       ├── server.ts         MongoDB connection and HTTP lifecycle
│       ├── models.ts         User, class, assignment, assessment, audit, notification
│       ├── routes.ts         Validated REST routes and authorization
│       ├── middleware.ts     JWT, roles, consistent errors
│       └── services/         External AI and isolated code runner adapters
├── student-frontend/        React + Vite student portal (5173)
├── teacher-frontend/        React + Vite teacher portal (5174)
├── .env.example
└── package.json             npm workspaces and convenience scripts
```

## Requirements and setup

- Node.js 20 or later and npm
- MongoDB 6 or later (local or managed)
- A separately deployed sandboxed Python runner for code execution
- Optional OpenAI-compatible chat completion service for viva and evaluation

From this directory:

```sh
copy .env.example backend/.env
npm install
npm run dev:backend
```

For an empty database, run `mongosh backend/mongo-init.js` with MongoDB available. It creates the six collections and indexes, without adding users or sample data. Then set `MONGO_URI=mongodb://127.0.0.1:27017/codeshield` and a strong random `JWT_SECRET` in `backend/.env`. Optional AI/runner settings are documented below. In separate terminals, run `npm run dev:student` and `npm run dev:teacher`. Copy each frontend's `.env.example` to `.env.local` when changing the API URL. The default API URL is `http://localhost:5000/api`.

Run the Mongo-backed API integration suite with `npm test`. Its temporary MongoDB binary downloads on the first run and is cached under `backend/.mongodb-binaries` (ignored by Git). Tests use a lower bcrypt cost only in the test process; the production default remains 12 rounds.

To build all workspaces, run `npm run build`. Frontend registration is available on each portal's login screen. The role is fixed by the portal form and is checked again by protected backend routes. Use institution-managed access controls in production to control who may register as a teacher.

## Environment variables

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 5000) |
| `MONGO_URI` | MongoDB connection URI |
| `JWT_SECRET` | JWT signing secret (32+ random characters in production) |
| `JWT_EXPIRES_IN` | Access-token lifetime (default 8h) |
| `CLIENT_STUDENT_URL` | CORS origin for student portal |
| `CLIENT_TEACHER_URL` | CORS origin for teacher portal |
| `AI_API_URL` | OpenAI-compatible API base URL |
| `AI_API_KEY` | AI provider secret; never place in frontend env |
| `AI_MODEL` | Provider model identifier |
| `CODE_RUNNER_URL` | Isolated runner base URL; API calls `/v1/run` |
| `CODE_RUNNER_TOKEN` | Optional shared bearer credential to runner |
| `VITE_API_URL` | Frontend API base URL, configured separately per app |

## Database and security

Models: User, ClassRoom, Assignment (with embedded questions and weighted rubric), Assessment (including test results, proctoring signals, viva evidence, AI proposal, teacher review), AuditLog and Notification. MongoDB creates collections and indexes as records are added. There is no seed step.

Express uses Helmet, exact-origin CORS, a JSON body limit, request rate limiting, Mongo query sanitization and consistent JSON errors. Passwords use bcrypt. The signed token carries immutable account ID and role; all teacher-only and student-only APIs check it server-side. Class/assignment/assessment access is scoped to the owning teacher or enrolled student. Important counters and timer timestamps are computed by the server. Submission can be repeated safely without creating duplicate state.

**Python sandbox:** the API never evaluates student code. A Docker-backed local runner is included under `code-runner/`. Install and start Docker Desktop, copy `code-runner/.env.example` to `code-runner/.env`, replace the sample token with a long random value, then start it from the project root with `docker compose --env-file code-runner/.env -f code-runner/docker-compose.yml up -d --build`. Copy that same token into `CODE_RUNNER_TOKEN` in `backend/.env`, set `CODE_RUNNER_URL=http://localhost:8000`, and restart the API. The runner exposes only localhost, requires the bearer token, and executes each Python testcase in its own network-disabled Docker container with memory, CPU, process, wall-clock and filesystem limits. For script-style solutions, test case `input` is sent on stdin and stdout is compared to `expectedOutput`. For function-style solutions (a top-level Python function without a `__main__` block), the runner calls the first public function: JSON objects are passed as keyword arguments, JSON arrays as positional arguments, and other input as one argument. For example, input `"\"level\""` represents the string `level` as a JSON string. The student sees configured visible inputs and expected outputs before running, then pass/fail and actual outputs beside the editor. On submission, the API generates an AI evaluation proposal when an OpenAI-compatible provider is configured; otherwise it creates a visible-test-based provisional grade and feedback. The teacher reviews the per-question answers, test evidence and proposal before publishing a final grade. If no tests were run, the proposal explicitly requests manual review. The first startup pulls `python:3.12-alpine`. Keep Docker Desktop running while using Run visible tests. Never expose the runner port publicly or mount the Docker socket into the API.

**AI provider:** the provider adapter requests JSON output and includes the student's submitted source and available evidence. AI results are stored as proposals; the teacher approval endpoint sets the published result. Never treat a model score as an approved grade. Missing AI configuration returns `AI_UNAVAILABLE` instead of manufacturing a response.

**Proctoring:** the student portal records tab visibility, fullscreen exit, camera permission and browser face-detection signals. It uses MediaPipe Tasks Vision Face Detector and reports model confidence/count, but does not infer gaze. Face events are signals for teacher review, not proof of misconduct. Camera and face analysis require browser permission; disclose processing, consent and retention before deployment.

## REST API

All responses use `{success, data}` or `{success:false, message, code}`. Protected routes require `Authorization: Bearer <token>`.

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | public | Create student or teacher account |
| POST | `/api/auth/login` | public | Login; portal can assert its expected role |
| GET | `/api/auth/me` | signed in | Current account |
| POST | `/api/classes` | teacher | Create class and random join code |
| GET | `/api/classes` | signed in | Owned or enrolled classes |
| GET | `/api/classes/:id` | authorized | Class details and roster |
| POST | `/api/classes/:id/join` | student | Join by `{joinCode}` (ID path segment is currently ignored) |
| DELETE | `/api/classes/:id/students/:studentId` | owning teacher | Remove enrolled student |
| POST | `/api/assignments` | teacher | Create class assignment and questions |
| GET | `/api/assignments` | signed in | Assignments scoped to owned/enrolled classes |
| GET/PUT/DELETE | `/api/assignments/:id` | authorized/owner | Read, update or remove assignment |
| POST | `/api/assessments/start` | student | Start/resume active session |
| GET | `/api/assessments/:id` | owner/teacher | Read assessment |
| POST | `/api/assessments/:id/run` | session owner | Execute via isolated runner |
| POST | `/api/assessments/:id/submit` | session owner | Idempotent submission |
| POST | `/api/assessments/:id/event` | active session owner | Record tab/fullscreen/camera signal |
| POST | `/api/viva/generate` | student | Request code-grounded AI question |
| GET/POST | `/api/viva/:id` and `/answer` | owner/teacher or student | Review viva / answer adaptively |
| POST/GET/PATCH | `/api/evaluation/:assessmentId` | owning teacher / authorized | Propose, read and approve/adjust evaluation |
| GET | `/api/reports/student` | student | Own assessment history |
| GET | `/api/reports/class/:id` | owning teacher | Class submissions |
| GET | `/api/reports/assignment/:id` | owning teacher | Assignment submissions |
| GET | `/api/notifications` | signed in | Current account notifications |

## Realtime events

Socket.IO uses JWT authentication in the handshake. An authenticated client can join `assessment:join` for an assessment; student ownership is checked before joining. The API emits `assessment:code-run`, `assessment:tab-switch`, `assessment:fullscreen-exit`, `assessment:face-confidence`, `assessment:viva-started`, and `assessment:submission` in assessment rooms. Extend notification fan-out to the teacher account room when deploying live monitoring; REST notifications are persisted now.

## Production deployment

Deploy the API, student app, teacher app, MongoDB, AI provider and isolated code runner as separate services. Configure exact HTTPS origins, strong secrets, TLS, database backups, secret storage, log redaction and retention. Add account verification, recovery, institution provisioning and refresh/revocation strategy before broad deployment. Restrict runner egress and resource use; keep AI and runner keys server-side. Configure face detection and informed consent to suit institutional policy and applicable law. The repository is a deployable foundation and workflow implementation, but external MongoDB, AI and sandbox services must be configured for their respective features.
