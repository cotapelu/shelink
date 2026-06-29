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
/**
 * v0.9.3 快递 API 配置（双 provider：快递鸟 主 + 快递100 备）
 *
 * SystemSetting 单 key `expressSettings`，value：
 *   {
 *     kdniao: { ebusinessId, appKeyCipher: {ct,iv,tag} },
 *     kuaidi100: { customer, keyCipher: {ct,iv,tag} }
 *   }
 *
 * appKey/key 用 storage/crypto 同密钥加密。
 */
import { prisma } from "@/lib/prisma";
import { encryptBuffer, decryptBuffer } from "@/lib/storage/crypto";

const EXPRESS_SETTINGS_KEY = "expressSettings";

type Cipher = { ct: string; iv: string; tag: string };

export interface StoredExpressSettings {
  kdniao: { ebusinessId: string; appKeyCipher: Cipher | null };
  kuaidi100: { customer: string; keyCipher: Cipher | null };
}

export interface ResolvedExpressSettings {
  kdniao: { ebusinessId: string; appKey: string; configured: boolean };
  kuaidi100: { customer: string; key: string; configured: boolean };
}

function enc(plain: string): Cipher | null {
  if (!plain) return null;
  const e = encryptBuffer(Buffer.from(plain, "utf-8"));
  return {
    ct: e.ciphertext.toString("base64"),
    iv: e.iv.toString("base64"),
    tag: e.authTag.toString("base64")
  };
}

function dec(c: Cipher | null): string {
  if (!c) return "";
  return decryptBuffer(Buffer.from(c.ct, "base64"), c.iv, c.tag).toString("utf-8");
}

export async function readStoredExpressSettings(): Promise<StoredExpressSettings> {
  const row = await prisma.systemSetting.findUnique({ where: { key: EXPRESS_SETTINGS_KEY } });
  const v = (row?.value as Partial<StoredExpressSettings> | null) ?? {};
  return {
    kdniao: {
      ebusinessId: v.kdniao?.ebusinessId ?? "",
      appKeyCipher: v.kdniao?.appKeyCipher ?? null
    },
    kuaidi100: {
      customer: v.kuaidi100?.customer ?? "",
      keyCipher: v.kuaidi100?.keyCipher ?? null
    }
  };
}

export async function readPublicExpressSettings(): Promise<{
  kdniao: { ebusinessId: string; configured: boolean; appKeyMasked: string };
  kuaidi100: { customer: string; configured: boolean; keyMasked: string };
}> {
  const s = await readStoredExpressSettings();
  const kdniaoKey = dec(s.kdniao.appKeyCipher);
  const kd100Key = dec(s.kuaidi100.keyCipher);
  return {
    kdniao: {
      ebusinessId: s.kdniao.ebusinessId,
      configured: !!(s.kdniao.ebusinessId && kdniaoKey),
      appKeyMasked: kdniaoKey ? `${kdniaoKey.slice(0, 4)}••••${kdniaoKey.slice(-4)}` : ""
    },
    kuaidi100: {
      customer: s.kuaidi100.customer,
      configured: !!(s.kuaidi100.customer && kd100Key),
      keyMasked: kd100Key ? `${kd100Key.slice(0, 4)}••••${kd100Key.slice(-4)}` : ""
    }
  };
}

export async function getExpressSettings(): Promise<ResolvedExpressSettings> {
  const s = await readStoredExpressSettings();
  const kdniaoKey = dec(s.kdniao.appKeyCipher);
  const kd100Key = dec(s.kuaidi100.keyCipher);
  return {
    kdniao: {
      ebusinessId: s.kdniao.ebusinessId,
      appKey: kdniaoKey,
      configured: !!(s.kdniao.ebusinessId && kdniaoKey)
    },
    kuaidi100: {
      customer: s.kuaidi100.customer,
      key: kd100Key,
      configured: !!(s.kuaidi100.customer && kd100Key)
    }
  };
}

export async function saveExpressSettings(input: {
  kdniaoEbusinessId?: string;
  kdniaoAppKey?: string;
  kdniaoClearKey?: boolean;
  kuaidi100Customer?: string;
  kuaidi100Key?: string;
  kuaidi100ClearKey?: boolean;
}) {
  const cur = await readStoredExpressSettings();
  const next: StoredExpressSettings = {
    kdniao: {
      ebusinessId: input.kdniaoEbusinessId ?? cur.kdniao.ebusinessId,
      appKeyCipher: input.kdniaoClearKey
        ? null
        : input.kdniaoAppKey
          ? enc(input.kdniaoAppKey)
          : cur.kdniao.appKeyCipher
    },
    kuaidi100: {
      customer: input.kuaidi100Customer ?? cur.kuaidi100.customer,
      keyCipher: input.kuaidi100ClearKey
        ? null
        : input.kuaidi100Key
          ? enc(input.kuaidi100Key)
          : cur.kuaidi100.keyCipher
    }
  };

  await prisma.systemSetting.upsert({
    where: { key: EXPRESS_SETTINGS_KEY },
    update: { value: next as object },
    create: { key: EXPRESS_SETTINGS_KEY, value: next as object }
  });

  return { ok: true };
}
