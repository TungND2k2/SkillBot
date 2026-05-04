/**
 * Backfill `owner.userId` + `owner.orgId` cho data hiện có.
 *
 * Chạy 1 lần sau khi deploy RBAC. Idempotent — bỏ qua doc đã có owner.
 *
 * Usage:
 *   PAYLOAD_URL=http://localhost:3001 \
 *   SEED_ADMIN_EMAIL=admin@skillbot.local \
 *   SEED_ADMIN_PASSWORD=... \
 *   npx tsx scripts/backfill-owner.ts
 */
const PAYLOAD_URL = process.env.PAYLOAD_URL ?? "http://localhost:3001";
const EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@skillbot.local";
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "123zXc_-";

const DEFAULT_ORG_ID = "skillbot-default";

const COLLECTIONS = [
  "orders",
  "customers",
  "fabrics",
  "suppliers",
  "inventory",
  "allowances",
  "qc-logs",
  "reminders",
  "media",
] as const;

interface DocLite {
  id: string;
  owner?: { userId?: unknown; orgId?: string } | null;
}

async function main() {
  console.log(`→ Login Payload @ ${PAYLOAD_URL}`);
  const loginRes = await fetch(`${PAYLOAD_URL}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!loginRes.ok) {
    console.error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
    process.exit(1);
  }
  const { token, user } = (await loginRes.json()) as {
    token: string;
    user: { id: string; email: string };
  };
  const auth = { Authorization: `JWT ${token}` };
  const adminId = user.id;
  console.log(`✓ Login OK as ${user.email} (id=${adminId})`);
  console.log(`  → backfill owner.userId=${adminId}, owner.orgId=${DEFAULT_ORG_ID}\n`);

  let totalChecked = 0;
  let totalPatched = 0;

  for (const slug of COLLECTIONS) {
    let page = 1;
    let updatedInColl = 0;
    let totalDocs = 0;

    while (true) {
      const url =
        `${PAYLOAD_URL}/api/${slug}` +
        `?limit=100&depth=0&page=${page}&pagination=true&overrideAccess=true`;
      const res = await fetch(url, { headers: auth });
      if (!res.ok) {
        console.error(`  ✗ list ${slug} page ${page}: ${res.status}`);
        break;
      }
      const data = (await res.json()) as {
        docs: DocLite[];
        totalDocs: number;
        totalPages: number;
      };
      totalDocs = data.totalDocs;

      for (const doc of data.docs) {
        totalChecked += 1;
        const owner = doc.owner ?? {};
        const hasUser = owner.userId !== undefined && owner.userId !== null;
        const hasOrg = !!owner.orgId;
        if (hasUser && hasOrg) continue;

        const patch: { owner: { userId: string; orgId: string } } = {
          owner: {
            userId: hasUser ? String((owner as { userId: string }).userId) : adminId,
            orgId: hasOrg ? owner.orgId! : DEFAULT_ORG_ID,
          },
        };
        const r = await fetch(`${PAYLOAD_URL}/api/${slug}/${doc.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...auth },
          body: JSON.stringify(patch),
        });
        if (r.ok) {
          updatedInColl += 1;
          totalPatched += 1;
        } else {
          console.error(`  ✗ patch ${slug}/${doc.id}: ${r.status}`);
        }
      }

      if (page >= data.totalPages) break;
      page += 1;
    }

    console.log(
      `✓ ${slug}: ${updatedInColl}/${totalDocs} doc đã backfill ` +
        `(các doc khác đã có owner)`,
    );
  }

  console.log(
    `\nDone. Checked ${totalChecked} docs, patched ${totalPatched} owners.`,
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
