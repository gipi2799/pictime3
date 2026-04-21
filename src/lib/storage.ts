import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "node:stream";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

let client: S3Client | null = null;

export function getStorageClient(): S3Client {
  if (client) return client;

  const endpoint = requireEnv("STORAGE_URL").replace(/\/$/, "");
  const region = process.env.STORAGE_REGION || "auto";
  const forcePathStyle =
    process.env.STORAGE_FORCE_PATH_STYLE === "true" ||
    process.env.STORAGE_FORCE_PATH_STYLE === "1";

  client = new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId: requireEnv("STORAGE_KEY"),
      secretAccessKey: requireEnv("STORAGE_SECRET"),
    },
    forcePathStyle,
  });

  return client;
}

export function getBucket(): string {
  return requireEnv("STORAGE_BUCKET");
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const c = getStorageClient();
  await c.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function presignedGetUrl(key: string, expiresIn = 3600): Promise<string> {
  const c = getStorageClient();
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });
  return getSignedUrl(c, command, { expiresIn });
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const out = await getObjectResponse(key);
  const body = out.Body;
  if (!body) {
    throw new Error("Empty object body");
  }
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function getObjectResponse(key: string): Promise<GetObjectCommandOutput> {
  const c = getStorageClient();
  return c.send(
    new GetObjectCommand({
      Bucket: getBucket(),
      Key: key,
    }),
  );
}

/** Node Readable for archiver / streaming downloads */
export async function getObjectReadable(key: string): Promise<Readable> {
  const res = await getObjectResponse(key);
  const body = res.Body;
  if (!body) {
    throw new Error("Empty object body");
  }
  return body as Readable;
}
