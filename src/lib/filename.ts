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
export function normalizeUploadedFilename(name: string) {
  if (!name) return name;
  if (!/[ÃÂÄÅÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßà-ÿ�]/.test(name)) return name;

  try {
    const bytes = Uint8Array.from(Array.from(name, (char) => char.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return scoreFilename(decoded) > scoreFilename(name) ? decoded : name;
  } catch {
    return name;
  }
}

function scoreFilename(name: string) {
  const cjk = (name.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const mojibake = (name.match(/[ÃÂÄÅÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßà-ÿ�]/g) ?? []).length;
  return cjk * 3 - mojibake;
}
