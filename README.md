# SkillBot

Telegram chatbot framework powered by **Claude Agent SDK**. Mỗi tenant có một bot riêng, người dùng chat qua Telegram, Claude tự động gọi các skill để thao tác dữ liệu (collections, workflows, forms, rules, files, scheduling, ...).

## Kiến trúc

```
Telegram user
    │
    ▼
TelegramChannel (polling)
    │ enqueue
    ▼
MessageQueue (priority, bounded concurrency)
    │ run
    ▼
resolveUser() ─── tenants / tenant_users (DB)
    │
    ▼
runPipeline()
    ├── loadOrCreateSession()   ─── conversation_sessions (DB)
    ├── compactHistory()        ─── tóm tắt lịch sử qua Claude
    ├── buildContext()          ─── load tenant config, resource counts
    ├── buildSystemPrompt()     ─── inject instructions + history
    ├── createSdkMcpServer()    ─── in-process MCP server với 34 skills
    └── query()                 ─── Claude Agent SDK
            │ tool calls
            ▼
        Skills (34 tools)
            └── PostgreSQL via Drizzle ORM
```

## Requirements

- **Node.js** 20+
- **PostgreSQL** 14+
- **Claude Max** subscription (OAuth, không cần API key)

## Cài đặt

```bash
git clone <repo>
cd SkillBot
npm install
```

## Cấu hình

Tạo file `.env`:

```env
# Bắt buộc
DATABASE_URL=postgresql://user:password@localhost:5432/skillbot

# Optional
LOG_LEVEL=info                    # debug | info | warn | error
CLAUDE_MODEL=claude-sonnet-4-20250514

# Queue
QUEUE_CONCURRENCY=5
QUEUE_MAX_SIZE=100
QUEUE_JOB_TIMEOUT_MS=120000

# Pipeline
MAX_TOOL_LOOPS=10
SUMMARY_THRESHOLD=30              # compact history khi đủ N messages
KEEP_RECENT_MESSAGES=20

# S3 (nếu dùng file upload)
S3_ENDPOINT=https://...
S3_BUCKET=skillbot
S3_ACCESS_KEY=...
S3_SECRET_KEY=...

# Dashboard (chưa implement)
HTTP_PORT=3102

# Cron
CRON_TICK_MS=5000
```

> Bot token **không** để trong `.env` — lưu trong cột `bot_token` của bảng `tenants`.

## Database setup

```bash
# Tạo database
psql -U postgres -c "CREATE DATABASE skillbot;"

# Generate migration files từ schema
npm run db:generate

# Chạy migrations
npm run db:migrate
```

## Thêm tenant & bot

```sql
INSERT INTO tenants (id, name, bot_token, status, instructions, config, ai_config, created_at, updated_at)
VALUES (
  '01JXXXXXXXXXXXXXXXXXXXXXXXXX',          -- ULID
  'My Bot',
  '7123456789:AAxxxxxxxxxxxxxxxxxxxxxxxx', -- token từ @BotFather
  'active',
  'Bạn là trợ lý thông minh cho công ty X.',
  '{"requireApproval": true}',             -- true = user mới cần admin duyệt
  '{}',
  extract(epoch from now()) * 1000,
  extract(epoch from now()) * 1000
);
```

## Chạy

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Skills (34 tools)

| Category | Tools |
|---|---|
| **collections** | list_collections, create_collection, add_row, list_rows, update_row, delete_row, search_rows |
| **workflows** | list_workflows, create_workflow, start_workflow, approve_workflow |
| **forms** | list_forms, create_form, start_form, update_form_field, cancel_form |
| **rules** | list_rules, create_rule, delete_rule |
| **users** | list_users, set_user_role, request_permission, approve_permission |
| **files** | list_files, read_file, upload_file |
| **knowledge** | save_knowledge, get_knowledge |
| **scheduling** | create_cron, list_crons, delete_cron |
| **admin** | update_instructions, get_dashboard, search_all |

## Database schema (17 tables)

```
tenants              — mỗi bot = 1 tenant
tenant_users         — users và roles
super_admins         — system owners
conversation_sessions — chat history per user
collections          — dynamic data tables
collection_rows      — rows trong collections
workflow_templates   — workflow definitions
workflow_instances   — running workflows
form_templates       — form definitions
business_rules       — business logic rules
permission_requests  — pending approvals
audit_logs           — action history
cron_jobs            — scheduled tasks
bot_docs             — knowledge base
files                — S3 file metadata
```

## Source structure

```
src/
├── config.ts                   env config (Zod validated)
├── index.ts                    entry point + graceful shutdown
├── db/
│   ├── connection.ts           Drizzle + postgres-js
│   ├── migrate.ts              auto-migrate on startup
│   ├── schema.ts               re-export all schemas
│   └── schemas/                17 table definitions
├── pipeline/
│   ├── history.ts              session load/save, compact, history context
│   ├── context-builder.ts      pre-fetch tenant data, resource counts
│   ├── prompt-builder.ts       build system prompt
│   └── pipeline.ts             core runPipeline() function
├── skills/
│   ├── _types.ts               SkillDef, SkillContext, ok/err helpers
│   ├── _registry.ts            load skills, build MCP tools
│   └── {category}/             34 skill files
├── channel/
│   ├── types.ts                Channel interface
│   └── telegram/
│       ├── telegram.channel.ts  multi-bot polling + sendNotification
│       ├── telegram.format.ts   Markdown → Telegram HTML
│       └── registration.ts      user resolve/register
├── queue/
│   └── message-queue.ts        priority queue, bounded concurrency
├── cron/
│   └── cron.service.ts         tick loop, skill execution
└── utils/
    ├── id.ts                   ULID generator
    ├── clock.ts                nowMs()
    └── logger.ts               structured logger
```

## Scripts

```bash
npm run dev           # tsx watch
npm run build         # tsc compile
npm start             # node dist/index.js
npm run db:generate   # drizzle-kit generate migrations
npm run db:migrate    # drizzle-kit migrate
npm test              # vitest run
```

## User roles

| Role | Quyền |
|---|---|
| `admin` | Toàn quyền |
| `manager` | Duyệt workflow, quản lý users |
| `user` | Sử dụng skills thông thường |
| `viewer` | Chỉ đọc |

## Multi-tenant

Mỗi tenant là một Telegram bot riêng biệt. Tất cả bots chạy trong cùng một process, chia sẻ một `MessageQueue`. Thêm tenant mới chỉ cần insert vào bảng `tenants` rồi restart.

## License

MIT
