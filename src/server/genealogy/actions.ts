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
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { audit } from '@/server/audit';

// Schemas
const CreatePersonSchema = z.object({
  fullName: z.string().min(1, 'Full name required'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  birthYear: z.number().int().positive().optional(),
  birthMonth: z.number().int().min(1).max(12).optional(),
  birthDay: z.number().int().min(1).max(31).optional(),
  deathYear: z.number().int().positive().optional(),
  deathMonth: z.number().int().min(1).max(12).optional(),
  deathDay: z.number().int().min(1).max(31).optional(),
  isDeceased: z.boolean().default(false),
  isInLaw: z.boolean().default(false),
  birthOrder: z.number().int().positive().optional(),
  generation: z.number().int().positive().optional(),
  otherNames: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  note: z.string().optional(),
  phoneNumber: z.string().optional(),
  occupation: z.string().optional(),
  currentResidence: z.string().optional(),
  fatherId: z.string().uuid().optional(),
  motherId: z.string().uuid().optional(),
});

const UpdatePersonInputSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1, 'Full name required').optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  birthYear: z.number().int().positive().optional(),
  birthMonth: z.number().int().min(1).max(12).optional(),
  birthDay: z.number().int().min(1).max(31).optional(),
  deathYear: z.number().int().positive().optional(),
  deathMonth: z.number().int().min(1).max(12).optional(),
  deathDay: z.number().int().min(1).max(31).optional(),
  isDeceased: z.boolean().optional(),
  isInLaw: z.boolean().optional(),
  birthOrder: z.number().int().positive().optional(),
  generation: z.number().int().positive().optional(),
  otherNames: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  note: z.string().optional(),
  phoneNumber: z.string().optional(),
  occupation: z.string().optional(),
  currentResidence: z.string().optional(),
  fatherId: z.string().uuid().optional(),
  motherId: z.string().uuid().optional(),
});

const GetPersonsQuerySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
  search: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  generation: z.coerce.number().optional(),
  minBirthYear: z.coerce.number().optional(),
  maxBirthYear: z.coerce.number().optional(),
  isDeceased: z.boolean().optional(),
});

const PERSON_SELECT = {
  id: true, fullName: true, gender: true, birthYear: true,
  birthMonth: true, birthDay: true, deathYear: true, deathMonth: true,
  deathDay: true, isDeceased: true, isInLaw: true, birthOrder: true,
  generation: true, avatarUrl: true, note: true,
  father: { select: { id: true, fullName: true } },
  mother: { select: { id: true, fullName: true } },
  outgoingRelationships: {
    include: {
      toPerson: { select: { id: true, fullName: true } }
    }
  },
  incomingRelationships: {
    include: {
      fromPerson: { select: { id: true, fullName: true } }
    }
  },
  events: {
    orderBy: { eventDate: 'desc' },
    take: 10,
  },
} as any;

// Actions
function buildPersonWhere(validated: z.infer<typeof GetPersonsQuerySchema>): any {
  const where: any = {};
  if (validated.search) where.fullName = { contains: validated.search };
  if (validated.gender) where.gender = validated.gender;
  if (validated.generation) where.generation = validated.generation;
  if (validated.minBirthYear || validated.maxBirthYear) {
    where.birthYear = {};
    if (validated.minBirthYear) where.birthYear.gte = validated.minBirthYear;
    if (validated.maxBirthYear) where.birthYear.lte = validated.maxBirthYear;
  }
  if (validated.isDeceased !== undefined) where.isDeceased = validated.isDeceased;
  return where;
}

export async function getPersons(query?: z.infer<typeof GetPersonsQuerySchema>) {
  const validated = GetPersonsQuerySchema.parse(query);
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const where = buildPersonWhere(validated);
  const select = {
    id: true, fullName: true, gender: true, birthYear: true,
    birthMonth: true, birthDay: true, deathYear: true, deathMonth: true,
    deathDay: true, isDeceased: true, isInLaw: true, birthOrder: true,
    generation: true, avatarUrl: true, note: true
  };
  const skip = (validated.page - 1) * validated.limit;
  const [items, total] = await Promise.all([
    prisma.person.findMany({ where, select, orderBy: { fullName: 'asc' }, skip, take: validated.limit }),
    prisma.person.count({ where })
  ]);
  return { persons: items, total, page: validated.page, totalPages: Math.ceil(total / validated.limit) };
}

export async function getPerson(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const person = await prisma.person.findUnique({
    where: { id },
    select: PERSON_SELECT,
  });

  if (!person) throw new Error('Person not found');
  return person;
}

export async function createPerson(input: z.infer<typeof CreatePersonSchema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  const data = CreatePersonSchema.parse(input);
  const created = await prisma.person.create({ data });
  await audit({ userId: session.user.id, action: 'PERSON_CREATE', targetType: 'Person', targetId: created.id, detail: { fullName: created.fullName } });
  revalidatePath('/genealogy/persons');
  return { ok: true, id: created.id };
}

export async function updatePerson(input: z.infer<typeof UpdatePersonInputSchema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  const data = UpdatePersonInputSchema.parse(input);
  const { id } = data;
  const rest = { ...data };
  delete (rest as any).id;
  const updated = await prisma.person.update({ where: { id }, data: rest });
  await audit({ userId: session.user.id, action: 'PERSON_UPDATE', targetType: 'Person', targetId: updated.id, detail: { changes: rest } });
  revalidatePath(`/genealogy/persons/${id}`);
  return { ok: true };
}

export async function deletePerson(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  await prisma.person.delete({ where: { id } });

  await audit({
    userId: session.user.id,
    action: 'PERSON_DELETE',
    targetType: 'Person',
    targetId: id,
    detail: {},
  });

  revalidatePath('/genealogy/persons');
  return { ok: true };
}

export async function getRelationships(personId?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  const where: any = personId ? { OR: [{ fromPersonId: personId }, { toPersonId: personId }] } : {};
  const relationships = await prisma.relationship.findMany({
    where,
    include: {
      fromPerson: { select: { id: true, fullName: true } },
      toPerson: { select: { id: true, fullName: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  return relationships;
}

export async function createRelationship(input: {
  fromPersonId: string;
  toPersonId: string;
  type: 'PARENT_CHILD' | 'SPOUSE' | 'SIBLING' | 'GRANDPARENT' | 'GRANDCHILD' | 'UNCLE_AUNT' | 'NEPHEW_NIECE' | 'COUSIN' | 'PARTNER' | 'GUARDIAN' | 'WARD';
  startDate?: Date;
  endDate?: Date;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  const rel = await prisma.relationship.create({ data: input });
  await audit({ userId: session.user.id, action: 'RELATIONSHIP_CREATE', targetType: 'Relationship', targetId: rel.id, detail: input });
  revalidatePath('/genealogy/relationships');
  return { ok: true, id: rel.id };
}

export async function deleteRelationship(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  await prisma.relationship.delete({ where: { id } });
  await audit({ userId: session.user.id, action: 'RELATIONSHIP_DELETE', targetType: 'Relationship', targetId: id, detail: {} });
  revalidatePath('/genealogy/relationships');
  return { ok: true };
}

export async function getEvents(personId?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  const where: any = personId ? { personId } : {};
  const events = await prisma.event.findMany({
    where,
    include: { person: { select: { id: true, fullName: true } } },
    orderBy: { eventDate: 'desc' }
  });
  return events;
}

const CreateEventSchema = z.object({
  personId: z.string().uuid(),
  type: z.enum(['BIRTH', 'DEATH', 'MARRIAGE', 'DIVORCE', 'MIGRATION', 'EDUCATION', 'EMPLOYMENT', 'MEDICAL', 'CUSTOM']),
  name: z.string(),
  eventDate: z.date(),
  location: z.string().optional(),
  description: z.string().optional(),
});

export async function createEvent(input: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  const data = CreateEventSchema.parse(input);
  const event = await prisma.event.create({ data });
  await audit({ userId: session.user.id, action: 'EVENT_CREATE', targetType: 'Event', targetId: event.id, detail: data });
  revalidatePath('/genealogy/events');
  return { ok: true, id: event.id };
}

export async function updateEvent(input: { id: string } & Partial<z.infer<typeof CreateEventSchema>>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  const { id, ...rest } = input;
  const data = CreateEventSchema.partial().parse(rest);
  const updated = await prisma.event.update({ where: { id }, data });
  await audit({ userId: session.user.id, action: 'EVENT_UPDATE', targetType: 'Event', targetId: updated.id, detail: { changes: rest } });
  revalidatePath('/genealogy/events');
  return { ok: true };
}

export async function deleteEvent(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  await prisma.event.delete({ where: { id } });

  await audit({
    userId: session.user.id,
    action: 'EVENT_DELETE',
    targetType: 'Event',
    targetId: id,
    detail: {},
  });

  revalidatePath('/genealogy/events');
  return { ok: true };
}
