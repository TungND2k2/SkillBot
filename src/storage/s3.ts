import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { ObjectId } from "mongodb";
import type { Config } from "../config.js";
import { getDb } from "../db/connection.js";
import type { FileDoc } from "../db/types.js";
import { nowMs } from "../utils/clock.js";
import { logger } from "../utils/logger.js";

// ── S3 client singleton ──────────────────────────────────────

let _client: S3Client | null = null;
let _bucket: string = "";

export function initStorage(config: Config): void {
  if (!config.S3_ENDPOINT || !config.S3_ACCESS_KEY || !config.S3_SECRET_KEY || !config.S3_BUCKET) {
    logger.warn("Storage", "S3 not configured — file uploads disabled");
    return;
  }
  _client = new S3Client({
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION,
    credentials: {
      accessKeyId: config.S3_ACCESS_KEY,
      secretAccessKey: config.S3_SECRET_KEY,
    },
    forcePathStyle: true,
  });
  _bucket = config.S3_BUCKET;
  logger.info("Storage", `S3 ready (${config.S3_ENDPOINT}/${config.S3_BUCKET})`);
}

function getClient(): S3Client {
  if (!_client) throw new Error("S3 not configured. Set S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET in .env");
  return _client;
}

function s3Key(tenantId: string, fileName: string, fileId: string): string {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const ext = fileName.includes(".") ? fileName.split(".").pop() : "bin";
  return `skillbot/${tenantId}/${month}/${fileId}.${ext}`;
}

// ── Upload ───────────────────────────────────────────────────

export async function uploadToS3(input: {
  tenantId: string;
  fileName: string;
  mimeType: string;
  body: Buffer;
  uploadedBy: string;
  channel: string;
}): Promise<FileDoc> {
  const client = getClient();
  const fileOid = new ObjectId();
  const key = s3Key(input.tenantId, input.fileName, fileOid.toHexString());

  logger.debug("Storage", `Uploading ${input.fileName} (${(input.body.length / 1024).toFixed(1)}KB) → ${key}`);

  await client.send(new PutObjectCommand({
    Bucket: _bucket,
    Key: key,
    Body: input.body,
    ContentType: input.mimeType,
    Metadata: {
      "tenant-id": input.tenantId,
      "uploaded-by": input.uploadedBy,
      "original-name": encodeURIComponent(input.fileName),
    },
  }));

  const s3Url = `${_bucket}/${key}`;

  const docData = {
    tenantId: input.tenantId,
    fileName: input.fileName,
    fileSize: input.body.length,
    mimeType: input.mimeType,
    s3Key: key,
    s3Url,
    uploadedBy: input.uploadedBy,
    channel: input.channel,
    createdAt: nowMs(),
  };

  const result = await getDb().collection("files").insertOne({ _id: fileOid, ...docData } as any);
  const fileId = result.insertedId.toHexString();
  logger.info("Storage", `Saved file ${fileId} (${input.fileName})`);
  return { _id: fileId, ...docData } as unknown as FileDoc;
}

// ── Download raw bytes ───────────────────────────────────────

export async function downloadFromS3(fileId: string): Promise<{ buffer: Buffer; doc: FileDoc } | null> {
  const doc = await getDb().collection<FileDoc>("files").findOne({ _id: new ObjectId(fileId) as any });
  if (!doc) return null;

  const client = getClient();
  const response = await client.send(new GetObjectCommand({ Bucket: _bucket, Key: doc.s3Key }));
  const bytes = await response.Body?.transformToByteArray();
  if (!bytes) return null;

  return { buffer: Buffer.from(bytes), doc };
}

// ── Delete ───────────────────────────────────────────────────

export async function deleteFromS3(fileId: string): Promise<boolean> {
  const doc = await getDb().collection<FileDoc>("files").findOne({ _id: new ObjectId(fileId) as any });
  if (!doc) return false;

  const client = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: _bucket, Key: doc.s3Key }));
  await getDb().collection("files").deleteOne({ _id: new ObjectId(fileId) as any });
  logger.info("Storage", `Deleted file ${fileId}`);
  return true;
}

// ── List files for tenant ────────────────────────────────────

export async function listTenantFiles(tenantId: string, limit = 20): Promise<FileDoc[]> {
  return getDb()
    .collection<FileDoc>("files")
    .find({ tenantId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export function isStorageConfigured(): boolean {
  return _client !== null;
}
