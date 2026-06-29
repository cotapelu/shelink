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
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanAccessMatter } from "@/lib/permissions";

const noteChannelSchema = z.enum(["PHONE", "WECHAT", "EMAIL", "MEETING", "COURT", "OTHER"]);

const noteCreateSchema = z.object({
  matterId: z.string().cuid(),
  channel: noteChannelSchema.default("OTHER"),
  withWhom: z.string().max(80).optional().or(z.literal("")),
  occurredAt: z.coerce.date().default(() => new Date()),
  content: z.string().min(1, "内容不能为空").max(5000),
  tags: z.array(z.string().max(20)).default([])
});

const noteUpdateSchema = noteCreateSchema.extend({
  id: z.string().cuid()
});

export type NoteCreateInput = z.infer<typeof noteCreateSchema>;
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>;

export async function createNote(input: NoteCreateInput) {
  const session = await requireSession();
  const data = noteCreateSchema.parse(input);
  await assertCanAccessMatter(session.user.id, session.user.role, data.matterId);
  await assertMatterWritable(data.matterId);

  const created = await prisma.note.create({
    data: {
      matterId: data.matterId,
      authorId: session.user.id,
      channel: data.channel,
      withWhom: data.withWhom || null,
      occurredAt: data.occurredAt,
      content: data.content,
      tags: data.tags
    }
  });

  await audit({
    userId: session.user.id,
    action: "NOTE_CREATE",
    targetType: "Note",
    targetId: created.id,
    detail: { matterId: data.matterId, channel: data.channel }
  });

  revalidatePath(`/matters/${data.matterId}`);
  return { ok: true, id: created.id };
}

export async function updateNote(input: NoteUpdateInput) {
  const session = await requireSession();
  const data = noteUpdateSchema.parse(input);

  const existing = await prisma.note.findUnique({ where: { id: data.id } });
  if (!existing) throw new Error("沟通记录不存在");
  if (existing.authorId !== session.user.id && session.user.role !== "ADMIN") {
    throw new Error("只能编辑自己的沟通记录");
  }
  await assertMatterWritable(existing.matterId);

  await prisma.note.update({
    where: { id: data.id },
    data: {
      channel: data.channel,
      withWhom: data.withWhom || null,
      occurredAt: data.occurredAt,
      content: data.content,
      tags: data.tags
    }
  });

  await audit({
    userId: session.user.id,
    action: "NOTE_UPDATE",
    targetType: "Note",
    targetId: data.id
  });

  revalidatePath(`/matters/${existing.matterId}`);
  return { ok: true };
}

export async function deleteNote(id: string) {
  const session = await requireSession();
  const existing = await prisma.note.findUnique({ where: { id } });
  if (!existing) return { ok: false };
  if (existing.authorId !== session.user.id && session.user.role !== "ADMIN") {
    throw new Error("只能删除自己的沟通记录");
  }
  await assertMatterWritable(existing.matterId);

  await prisma.note.update({
    where: { id },
    data: { deletedAt: new Date() }
  });

  await audit({
    userId: session.user.id,
    action: "NOTE_DELETE",
    targetType: "Note",
    targetId: id
  });

  revalidatePath(`/matters/${existing.matterId}`);
  return { ok: true };
}

export async function listNotes(matterId: string) {
  const session = await requireSession();
  await assertCanAccessMatter(session.user.id, session.user.role, matterId);
  return prisma.note.findMany({
    where: { matterId, deletedAt: null },
    orderBy: { occurredAt: "desc" },
    include: { author: { select: { id: true, name: true } } }
  });
}
