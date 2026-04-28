# SkillBot

Telegram chatbot framework powered by **Claude Agent SDK** + **MongoDB**. Mỗi tenant có một bot riêng, người dùng chat qua Telegram, Claude tự động gọi các skill để thao tác dữ liệu (collections, workflows, forms, rules, files, scheduling, ...).

## Kiến trúc

```
Telegram user
    │
    ▼
TelegramChannel (long polling)
    │ enqueue
    ▼
MessageQueue (priority, bounded concurrency)
    │ run
    ▼
resolveUser() ─── tenants / tenant_users (MongoDB)
    │
    ▼
runPipeline()
    ├── loadOrCreateSession()   ─── conversation_sessions
    ├── compactHistory()        ─── tóm tắt lịch sử qua Claude
    ├── buildContext()          ─── load tenant config, resource counts
    ├── buildSystemPrompt()     ─── inject instructions + history
    ├── createSdkMcpServer()    ─── in-process MCP server với 34 skills
    └── query()                 ─── Claude Agent SDK
            │ tool calls
            ▼
        Skills (34 tools)
            └── MongoDB driver
```

## Requirements

- **Node.js** 20+
- **MongoDB** 6+ (local hoặc Atlas)
- **Claude Max** subscription (OAuth, không cần API key) hoặc `ANTHROPIC_API_KEY`
- Optional: **MarkItDown** service nếu muốn extract text từ file upload

## Cài đặt

```bash
git clone <repo>
cd SkillBot
npm install
```

> Nếu npm phàn nàn peer-deps, dùng `npm install --legacy-peer-deps`.

## Cấu hình

Tạo file `.env`:

```env
# Bắt buộc
DATABASE_URL=mongodb://localhost:27017/skillbot

# Optional
LOG_LEVEL=info                    # debug | info | warn | error
CLAUDE_MODEL=claude-sonnet-4-20250514

# Queue
QUEUE_CONCURRENCY=5
QUEUE_MAX_SIZE=100
QUEUE_JOB_TIMEOUT_MS=120000

# Pipeline
MAX_TOOL_LOOPS=10
SUMMARY_THRESHOLD=24              # compact history khi đủ N messages
KEEP_RECENT_MESSAGES=10

# S3 (nếu dùng file upload)
S3_ENDPOINT=https://...
S3_BUCKET=skillbot
S3_ACCESS_KEY=...
S3_SECRET_KEY=...

# Cron tick (ms)
CRON_TICK_MS=5000

# MarkItDown (file extraction service)
MARKITDOWN_URL=http://localhost:8080
```

> Bot token **không** để trong `.env` — lưu trong field `botToken` của document `tenants`.

## Database setup

```bash
# MongoDB chạy local hoặc Atlas — chỉ cần DATABASE_URL trỏ đúng
# Migrations (tạo collections + indexes) chạy tự động khi boot.
# Nếu muốn chạy manual:
npm run db:migrate

# Seed tenant đầu tiên
SEED_BOT_TOKEN=7123456789:AAxxx SEED_TENANT_NAME="My Bot" npm run db:seed
```

## Thêm tenant & bot thủ công

```js
// MongoDB shell
db.tenants.insertOne({
  name: "My Bot",
  botToken: "7123456789:AAxxxxxxxxxxxxxxxxxxxxxxxx", // token từ @BotFather
  botStatus: "active",
  status: "active",
  instructions: "Bạn là trợ lý thông minh cho công ty X.",
  config: { requireApproval: true },                  // true = user mới cần admin duyệt
  aiConfig: {},
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
```

## Chạy

```bash
# Development (tsx)
npm run dev

# Production
npm run build
npm start
```

## Skills (34 tools)

| Category | Tools |
|---|---|
| **collections** | list_collections, create_collection, add_row, list_rows, update_row, delete_row, search_rows |
| **workflows** | list_workflows, create_workflow, update_workflow, delete_workflow, start_workflow_instance, approve_workflow |
| **forms** | list_forms, create_form, update_form, delete_form, start_form, update_form_field, cancel_form |
| **rules** | list_rules, create_rule, delete_rule |
| **users** | list_users, list_roles, set_user_role, request_permission, approve_permission |
| **files** | list_files, read_file, upload_file |
| **knowledge** | save_knowledge, get_knowledge |
| **scheduling** | create_cron, list_crons, delete_cron |
| **admin** | update_instructions, get_dashboard, search_all |

## MongoDB collections

```
super_admins          — system owners (cross-tenant)
tenants               — mỗi bot = 1 tenant (chứa botToken, instructions, config)
tenant_roles          — role definitions per tenant (admin/manager/user/viewer + custom)
tenant_users          — users mapped vào tenant + role
conversation_sessions — chat history per (tenant, channel, channelUserId)
collections           — dynamic data tables
collection_rows       — rows trong collections
workflow_templates    — workflow definitions
workflow_instances    — running workflows
workflow_approvals    — approval records
form_templates        — form definitions
business_rules        — business logic rules
permission_requests   — pending approvals
audit_logs            — action history
cron_jobs             — scheduled tasks (cron expression)
bot_docs              — knowledge base
files                 — S3 file metadata
```

## Source structure

```
src/
├── config.ts                   env config (Zod validated)
├── index.ts                    entry point + graceful shutdown
├── db/
│   ├── connection.ts           MongoDB driver
│   ├── migrate.ts              ensure collections + indexes on startup
│   ├── schema.ts               re-export types
│   ├── types.ts                document interfaces
│   └── seed.ts                 seed initial tenant
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
│   ├── cron.service.ts         tick loop, skill execution
│   └── cron-schedule.ts        cron-parser wrapper (nextRunAt, validateCron)
├── storage/
│   ├── s3.ts                   S3 upload/read/delete
│   └── extractor.ts            MarkItDown file → text
└── utils/
    ├── id.ts                   ULID generator (cho non-DB IDs như queue jobs)
    ├── clock.ts                nowMs()
    └── logger.ts               structured logger
```

## Scripts

```bash
npm run dev           # tsx watch
npm run build         # tsc compile
npm start             # node dist/index.js
npm run db:migrate    # ensure collections + indexes
npm run db:seed       # seed tenant từ env vars (SEED_BOT_TOKEN, SEED_TENANT_NAME)
npm test              # vitest run
npm run test:bot      # bot integration tests
```

## User roles (mặc định)

| Role | Quyền |
|---|---|
| `admin` | Toàn quyền |
| `manager` | Duyệt workflow, quản lý users (không đổi admin) |
| `user` | Sử dụng skills thông thường |
| Custom roles | Tạo qua DB hoặc skill (vd: sale, qc, intern) |

Roles lưu trong collection `tenant_roles` per tenant — có thể custom thêm role bất kỳ với `level` riêng.

## Multi-tenant

Mỗi tenant là một Telegram bot riêng biệt. Tất cả bots chạy trong cùng một process, chia sẻ một `MessageQueue`. Thêm tenant mới chỉ cần insert vào collection `tenants` rồi restart.

## Cron expressions

Skill `create_cron` chấp nhận cron expression chuẩn 5-trường (`m h dom mon dow`). Ví dụ:

| Expression | Ý nghĩa |
|---|---|
| `0 9 * * 1` | Thứ Hai 9h sáng |
| `0 17 * * 5` | Thứ Sáu 17h |
| `*/15 * * * *` | Mỗi 15 phút |
| `0 0 1 * *` | Đầu mỗi tháng |

## License

MIT
