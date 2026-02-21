import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "./config";
import path from "path";
import crypto from "crypto";

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.R2_ACCESS_KEY_ID!,
        secretAccessKey: config.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3Client;
}

export function isR2Configured(): boolean {
  return !!(
    config.R2_ACCOUNT_ID &&
    config.R2_ACCESS_KEY_ID &&
    config.R2_SECRET_ACCESS_KEY &&
    config.R2_BUCKET_NAME &&
    config.R2_PUBLIC_URL
  );
}

/**
 * Upload a file buffer to Cloudflare R2.
 * Returns the public URL of the uploaded file.
 */
export async function uploadToR2(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  folder: string,
): Promise<string> {
  const client = getS3Client();
  const ext = path.extname(originalName);
  const uniqueId = crypto.randomBytes(16).toString("hex");
  const key = `${folder}/${uniqueId}${ext}`;

  await client.send(
    new PutObjectCommand({
      Bucket: config.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );

  // Return the public URL
  const publicUrl = config.R2_PUBLIC_URL!.replace(/\/$/, "");
  return `${publicUrl}/${key}`;
}
