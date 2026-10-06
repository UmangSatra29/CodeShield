# CodeShield API reference

Base URL: `http://localhost:5000/api`. JSON requests and responses. Protected methods require `Authorization: Bearer <JWT>`. User roles: `STUDENT`, `TEACHER`.

Errors: `{ "success": false, "message": "...", "code": "..." }`. Request validation failures return 400; missing/expired credentials 401; role/scope failures 403; missing records 404; conflicts 409; unavailable external services 503.

## Authentication

- `POST /auth/register` `{name,email,password,role}` (password minimum 10)
- `POST /auth/login` `{email,password,role?}`
- `POST /auth/logout` (JWT required; clients discard access token)
- `GET /auth/me`

Register returns `{token,user}`. Teacher registration exists for initial deployment; production systems should gate teacher provisioning.

## Classes and assignments

- `POST /classes` teacher `{name,description?}` returns class including generated `joinCode`.
- `GET /classes`, `GET /classes/:id` are scoped to owner/enrolled user.
- `POST /classes/join` student `{joinCode}` (the `POST /classes/:id/join` form also works); join code is validated in MongoDB.
- `DELETE /classes/:id/students/:studentId` owning teacher.
- `POST /assignments` teacher `{title,description,classId,difficulty,timeLimit,maxAttempts,questions,rubric?,startDate?,endDate?}`. Each question takes `{title,description,starterCode,language,visibleTestCases:[{input,expectedOutput}],hiddenTestCases:[...],marks}`. Rubric weights must total 100.
- `GET /assignments` scoped to teacher or classes joined by student; `GET /assignments/:id` scoped; `PUT /assignments/:id` owning teacher; `DELETE /assignments/:id` owning teacher.

## Assessments, viva and evaluation

- `POST /assessments/start` student `{assignmentId}`. Returns active session with server `startedAt`/`expiresAt`.
- `GET /assessments/:id` participant/owning teacher.
- `POST /assessments/:id/save` student autosave `{code}`; only active owned sessions are writable.
- `POST /assessments/:id/run` student `{code,questionId}`. Code is forwarded to the isolated runner with visible test cases.
- `POST /assessments/:id/submit` student `{code}`. Repeated submissions are idempotent.
- `POST /assessments/:id/event` student `{type,metadata?}` for `TAB_SWITCH`, `FULLSCREEN_EXIT`, `FACE_CONFIDENCE`, `FACE_NOT_DETECTED`, `MULTIPLE_FACES`, `CAMERA_PERMISSION`. The third `TAB_SWITCH` auto-submits the assessment, generates a provisional visible-test grade/feedback proposal, notifies the teacher, and returns `autoSubmitted: true`. A manual submission generates the same proposal: AI-based when configured, visible-test fallback otherwise. The teacher report includes answers by question, latest visible-test evidence and the proposal. The teacher must review and approve a final grade.
- `POST /viva/generate` student `{assessmentId}`; `GET /viva/:id`; `POST /viva/:id/answer` student `{answer}`.
- `POST /evaluation/:assessmentId` owning teacher requests AI proposal.
- `GET /evaluation/:assessmentId` scoped read.
- `PATCH /evaluation/:assessmentId` owning teacher `{approved,finalScore,feedback,rubricScores?}`. Approval publishes result to student.

## Reports, notifications, realtime

- `GET /reports/student` student; `GET /reports/class/:id` and `GET /reports/assignment/:id` owning teacher.
- `GET /notifications` current user.
- Socket.IO endpoint shares API origin; supply `{auth:{token}}` and emit `assessment:join` with `{assessmentId}`. Server emits assessment activity events to its room.
