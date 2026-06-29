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
 * Storage facade — re-exports the active provider based on STORAGE_PROVIDER
 * env var (default: "local").
 *
 * Usage:
 *   import { storage } from "@/lib/storage";
 *   const path = await storage.writeFile("m_abc", buf);
 */
import type { StorageProvider } from "./provider";
import { LocalStorageProvider } from "./local";

export type { StorageProvider } from "./provider";

let _instance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (_instance) return _instance;

  const provider = process.env.STORAGE_PROVIDER ?? "local";

  switch (provider) {
    case "local": {
      _instance = new LocalStorageProvider();
      return _instance;
    }
    case "s3": {
      // v0.17: @aws-sdk/client-s3 已为正式依赖；按需 require 避免 local 模式
      // 在启动时加载它的 ~47 个传递依赖。
      const { S3StorageProvider } = require("./s3") as typeof import("./s3");
      _instance = new S3StorageProvider();
      return _instance;
    }
    default:
      throw new Error(`Unknown STORAGE_PROVIDER: ${provider}`);
  }
}

/** Singleton storage provider for the configured backend. */
export const storage: StorageProvider = getStorageProvider();
