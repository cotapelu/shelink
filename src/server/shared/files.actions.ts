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
'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');

export async function uploadFile(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const file = formData.get('file') as File;
  const entityType = formData.get('entityType') as string | null;
  const entityId = formData.get('entityId') as string | null;

  if (!file) throw new Error('No file provided');

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = `${Date.now()}_${file.name}`;
  const filepath = join(UPLOAD_DIR, filename);

  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }

  await writeFile(filepath, buffer);

  const fileRecord = await prisma.file.create({
    data: {
      name: file.name,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      path: filepath,
      url: `/uploads/${filename}`,
      entityType,
      entityId,
      uploadedById: session.user.id,
    } as any,
  });

  return fileRecord;
}

export async function getFile(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) throw new Error('File not found');
  return file;
}

export async function deleteFile(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) throw new Error('File not found');

  try {
    await unlink(file.path);
  } catch (e) {
    // ignore
  }

  await prisma.file.delete({ where: { id } });
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function listFiles(entityType?: string, entityId?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const where: any = {};
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;

  const files = await prisma.file.findMany({
    where,
    orderBy: { uploadedAt: 'desc' },
    include: {
      uploadedBy: { select: { id: true, name: true } },
    },
  });

  return files;
}
