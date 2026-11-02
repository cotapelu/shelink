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
 * Prisma include validator + kieu row cho export xlsx Matters. Thuần (khong DB) — tach tu export-xlsx.ts.
 */
import { Prisma } from "@prisma/client";

export const intakeInclude = Prisma.validator<Prisma.IntakeInclude>()({
  client: {
    select: {
      id: true,
      name: true,
      type: true,
      idNumber: true,
      address: true,
      phone: true,
      legalRep: true,
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 3,
        select: { name: true, title: true, phone: true, email: true, isPrimary: true }
      }
    }
  },
  cause: { select: { name: true } },
  ownerUser: { select: { id: true, name: true } },
  parties: { orderBy: [{ role: "asc" }, { ordinal: "asc" }] },
  matter: { select: { id: true, internalCode: true, firmCaseNo: true, title: true } },
  documents: {
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { name: true, category: true, createdAt: true }
  }
});

export const matterInclude = Prisma.validator<Prisma.MatterInclude>()({
  primaryClient: {
    select: {
      id: true,
      name: true,
      type: true,
      idNumber: true,
      address: true,
      phone: true,
      legalRep: true,
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 3,
        select: { name: true, title: true, phone: true, email: true, isPrimary: true }
      }
    }
  },
  clientLinks: {
    orderBy: { addedAt: "asc" },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          type: true,
          idNumber: true,
          address: true,
          phone: true,
          legalRep: true
        }
      }
    }
  },
  owner: { select: { id: true, name: true } },
  members: {
    orderBy: { joinedAt: "asc" },
    include: { user: { select: { id: true, name: true } } }
  },
  cause: { select: { name: true } },
  intake: { include: intakeInclude },
  parties: { orderBy: [{ role: "asc" }, { ordinal: "asc" }] },
  procedures: {
    orderBy: { order: "asc" },
    include: {
      leadLawyer: { select: { id: true, name: true } },
      procedureParties: {
        orderBy: [{ standing: "asc" }, { ordinal: "asc" }],
        include: { party: true }
      },
      hearings: {
        orderBy: { startsAt: "desc" },
        take: 1,
        select: { startsAt: true }
      }
    }
  },
  relatedEntities: {
    orderBy: { createdAt: "asc" },
    select: { name: true, relationship: true, notes: true }
  },
  linksFrom: {
    include: { relatedMatter: { select: { internalCode: true, firmCaseNo: true, title: true } } }
  },
  linksTo: {
    include: { matter: { select: { internalCode: true, firmCaseNo: true, title: true } } }
  },
  documents: {
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { name: true, category: true, createdAt: true }
  }
});

export type IntakeExportRow = Prisma.IntakeGetPayload<{ include: typeof intakeInclude }>;
export type MatterExportRow = Prisma.MatterGetPayload<{ include: typeof matterInclude }>;
