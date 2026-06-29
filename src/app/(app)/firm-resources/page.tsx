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
 * v0.38: 律所文书恢复独立页（v0.37 曾并入 /service-center，现拆回真实页面）
 * v0.44: 分类改为合同/函件/证照/其他
 */
import type { FirmFileCategory } from "@prisma/client";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listFirmFiles } from "@/server/firm-files/actions";
import { FirmFilesView } from "./_components/firm-files-view";

const VALID_CATEGORIES: FirmFileCategory[] = ["CONTRACT", "LETTER", "LICENSE", "OTHER_FIRM"];

export default async function FirmResourcesPage({
  searchParams
}: {
  searchParams: { category?: string; q?: string; includeOld?: string };
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const isManager =
    session.user.role === "ADMIN" || session.user.role === "PRINCIPAL_LAWYER";

  const category =
    searchParams.category && (VALID_CATEGORIES as string[]).includes(searchParams.category)
      ? (searchParams.category as FirmFileCategory)
      : undefined;

  const files = await listFirmFiles({
    category,
    search: searchParams.q?.trim(),
    includeSuperseded: searchParams.includeOld === "1"
  });

  return (
    <FirmFilesView
      files={files}
      canUpload={isManager}
      currentCategory={category}
      currentSearch={searchParams.q ?? ""}
      includeSuperseded={searchParams.includeOld === "1"}
      categorySet="firm"
    />
  );
}
