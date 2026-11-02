/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */
/**
 * Provider lưu trữ tương thích S3 (bản đầy đủ v0.17).
 *
 * Cách bật: đặt STORAGE_PROVIDER=s3 trong .env và cung cấp:
 *   - AWS_REGION (bắt buộc, ví dụ ap-southeast-1)
 *   - S3_BUCKET (bắt buộc)
 *   - AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (bắt buộc IAM key; hoặc cơ chế xác thực AWS khác)
 *   - S3_ENDPOINT (tuỳ chọn, kho tự build tương thích S3 như MinIO/R2)
 *   - S3_FORCE_PATH_STYLE (tuỳ chọn, true dùng path-style; MinIO bắt buộc true)
 *   - S3_KEY_PREFIX (tuỳ chọn, thêm tiền tố vào mọi object key, thuận tiện dùng chung một bucket cho nhiều môi trường)
 */
import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  type S3ClientConfig
} from "@aws-sdk/client-s3";
import type { StorageProvider } from "./provider";

function readBucket(): string {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("Chưa cấu hình S3_BUCKET");
  return bucket;
}

function readRegion(): string {
  const region = process.env.AWS_REGION;
  if (!region) throw new Error("Chưa cấu hình AWS_REGION");
  return region;
}

function readKeyPrefix(): string {
  const p = process.env.S3_KEY_PREFIX ?? "";
  if (!p) return "";
  return p.endsWith("/") ? p : `${p}/`;
}

function buildClient(): S3Client {
  const config: S3ClientConfig = {
    region: readRegion()
  };
  if (process.env.S3_ENDPOINT) {
    config.endpoint = process.env.S3_ENDPOINT;
  }
  if (process.env.S3_FORCE_PATH_STYLE === "true") {
    config.forcePathStyle = true;
  }
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    };
  }
  return new S3Client(config);
}

/**
 * AWS SDK trả body của object dạng ReadableStream / stream-like; chuẩn hoá về Buffer.
 */
async function streamToBuffer(stream: unknown): Promise<Buffer> {
  if (!stream) return Buffer.alloc(0);
  if (Buffer.isBuffer(stream)) return stream;

  const maybeSdk = stream as {
    transformToByteArray?: () => Promise<Uint8Array>;
  };
  if (typeof maybeSdk.transformToByteArray === "function") {
    const arr = await maybeSdk.transformToByteArray();
    return Buffer.from(arr);
  }

  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const s = stream as NodeJS.ReadableStream;
    s.on("data", (chunk: Buffer | string) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    );
    s.on("end", () => resolve(Buffer.concat(chunks)));
    s.on("error", reject);
  });
}

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private prefix: string;

  constructor() {
    this.client = buildClient();
    this.bucket = readBucket();
    this.prefix = readKeyPrefix();
  }

  /**
   * Cấu trúc object key: <prefix>/<scope>/<yyyymm>/<uuid>.bin
   * Giữ cùng layout với LocalStorageProvider, thuận tiện chuyển local ↔ s3.
   * DB chỉ lưu relPath (không gồm prefix), đổi prefix không cần backfill.
   */
  async writeFile(scope: string, data: Buffer): Promise<string> {
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const safeScope = scope.replace(/[^a-zA-Z0-9_-]/g, "_");
    const relPath = `${safeScope}/${yyyymm}/${randomUUID()}.bin`;
    const key = this.prefix + relPath;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: "application/octet-stream"
      })
    );

    return relPath;
  }

  async readFile(relPath: string): Promise<Buffer> {
    const key = this.prefix + relPath;
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key })
    );
    return streamToBuffer(res.Body);
  }

  async deleteFile(relPath: string): Promise<void> {
    const key = this.prefix + relPath;
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
      );
    } catch (err) {
      const code =
        (err as { name?: string }).name ?? (err as { Code?: string }).Code;
      if (code === "NoSuchKey" || code === "NotFound") return;
      throw err;
    }
  }
}
