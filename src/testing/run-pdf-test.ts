/**
 * Quick test: download a file from S3 by ID, extract text, send to pipeline.
 * Usage: npx tsx src/testing/run-pdf-test.ts [fileId]
 */
import "dotenv/config";
import { loadConfig } from "../config.js";
import { initDb, connectDb, getDb } from "../db/connection.js";
import { initStorage, downloadFromS3 } from "../storage/s3.js";
import { extractText } from "../storage/extractor.js";
import { loadSkills } from "../skills/_registry.js";
import { runPipeline } from "../pipeline/pipeline.js";
import { TelegramReporter } from "./reporter.js";
import { logger } from "../utils/logger.js";

const TENANT_ID = process.env.TEST_TENANT_ID ?? "69d346f7682cc9e3f837f72b";
const OBSERVER_CHAT_ID = Number(process.env.TEST_OBSERVER_CHAT_ID ?? "1963992425");
const FILE_ID = process.argv[2] ?? "69d3662dace76a192a03d186";
const USER_ID = `test_pdf_${FILE_ID}`;

async function main() {
  const config = loadConfig();
  initDb(config.DATABASE_URL);
  await connectDb();
  initStorage(config);
  await loadSkills();

  const db = getDb();
  const reporter = await TelegramReporter.create(db, TENANT_ID, OBSERVER_CHAT_ID);

  await reporter.log(`🧪 **PDF Test** — file ID: \`${FILE_ID}\``);

  // 1. Download from S3
  logger.info("PdfTest", `Downloading file ${FILE_ID}...`);
  const result = await downloadFromS3(FILE_ID);
  if (!result) {
    await reporter.log(`❌ File not found: \`${FILE_ID}\``);
    process.exit(1);
  }
  const { buffer, doc } = result;
  await reporter.log(`📥 Tải về: **${doc.fileName}** (${(buffer.length / 1024).toFixed(1)} KB, ${doc.mimeType})`);

  // 2. Extract text
  logger.info("PdfTest", `Extracting text from ${doc.fileName}...`);
  const t0 = Date.now();
  const { content, truncated } = await extractText(buffer, doc.mimeType, doc.fileName);
  const extractMs = Date.now() - t0;
  await reporter.log(
    `📄 **Extracted** (${extractMs}ms, ${content.length} chars${truncated ? ", truncated" : ""}):\n\`\`\`\n${content.slice(0, 500)}\n\`\`\``
  );

  // 3. Build message same as Telegram channel does
  const sizeStr = buffer.length > 1024 * 1024
    ? `${(buffer.length / 1024 / 1024).toFixed(1)}MB`
    : `${(buffer.length / 1024).toFixed(1)}KB`;

  const fileMessage = [
    `[FILE: ${doc.fileName} | ${doc.mimeType} | ${sizeStr} | id:${FILE_ID}]`,
    "",
    content,
  ].join("\n");

  // 4. Send to pipeline
  logger.info("PdfTest", "Sending to pipeline...");
  await reporter.log(`➡️ Gửi vào pipeline...`);
  const t1 = Date.now();
  const output = await runPipeline({
    tenantId: TENANT_ID,
    channel: "test",
    channelUserId: USER_ID,
    userName: "Test PDF",
    userRole: "sale",
    message: fileMessage,
    db,
    config,
  });
  const pipelineMs = Date.now() - t1;

  // 5. Report result
  await reporter.log(`🤖 **Bot reply** (${pipelineMs}ms):\n${output.reply}`);
  logger.info("PdfTest", `Done in ${pipelineMs}ms`);
  logger.info("PdfTest", `Reply: ${output.reply.slice(0, 200)}`);

  process.exit(0);
}

main().catch(async err => {
  logger.error("PdfTest", "Fatal", err);
  process.exit(1);
});
