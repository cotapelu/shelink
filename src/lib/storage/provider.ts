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
 * Storage provider abstraction.
 *
 * All file I/O in LawLink goes through this interface so that the backing
 * store can be swapped (local filesystem, S3, etc.) without touching
 * business logic.
 */
export interface StorageProvider {
  /**
   * Persist a binary blob under the given scope.
   * @returns Relative path (stored in DB for later retrieval).
   */
  writeFile(scope: string, data: Buffer): Promise<string>;

  /** Read a previously written file by its relative path. */
  readFile(relPath: string): Promise<Buffer>;

  /** Delete a previously written file. Tolerates already-missing files. */
  deleteFile(relPath: string): Promise<void>;
}
