/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { encryptBuffer, decryptBuffer, sha256 } from "@/lib/storage/crypto";

beforeAll(() => {
  // 测试用固定密钥（32 字节 base64）
  process.env.STORAGE_ENCRYPTION_KEY = "dGVzdC1rZXktMzItYnl0ZXMtbG9uZy1lbm91Z2gteHg=";
});

describe("crypto", () => {
  it("encryptBuffer + decryptBuffer roundtrip", () => {
    const plain = Buffer.from("LawLink 文档加密测试 🔒");
    const { ciphertext, iv, authTag } = encryptBuffer(plain);
    const restored = decryptBuffer(ciphertext, iv.toString("base64"), authTag.toString("base64"));
    expect(restored.toString()).toBe(plain.toString());
  });

  it("不同明文产生不同密文", () => {
    const a = encryptBuffer(Buffer.from("AAA"));
    const b = encryptBuffer(Buffer.from("BBB"));
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
  });

  it("相同明文不同 IV（随机性）", () => {
    const plain = Buffer.from("same");
    const a = encryptBuffer(plain);
    const b = encryptBuffer(plain);
    expect(a.iv.equals(b.iv)).toBe(false);
  });

  it("sha256 一致性", () => {
    const data = Buffer.from("hello");
    expect(sha256(data)).toBe(sha256(data));
    expect(sha256(data)).toHaveLength(64); // hex string
  });
});
