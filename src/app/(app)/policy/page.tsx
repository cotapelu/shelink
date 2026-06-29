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
 * v0.38: 制度规范独立页（律所文书里的 POLICY 分类，只列文件、不显分类筛选）
 * v0.44: 标题与上传按钮同行（不再 hideHeader，改用 headerTitle 覆盖）
 */
import { redirect } from "next/navigation";
import { BookText } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { listFirmFiles } from "@/server/firm-files/actions";
import { FirmFilesView } from "@/app/(app)/firm-resources/_components/firm-files-view";

export default async function PolicyPage({
  searchParams
}: {
  searchParams: { q?: string; includeOld?: string };
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const isManager =
    session.user.role === "ADMIN" || session.user.role === "PRINCIPAL_LAWYER";

  const files = await listFirmFiles({
    category: "POLICY",
    search: searchParams.q?.trim(),
    includeSuperseded: searchParams.includeOld === "1"
  });

  return (
    <FirmFilesView
      files={files}
      canUpload={isManager}
      currentCategory="POLICY"
      currentSearch={searchParams.q ?? ""}
      includeSuperseded={searchParams.includeOld === "1"}
      basePath="/policy"
      hideCategoryNav
      headerTitle="制度规范"
      headerSubtitle={`全所制度文件（员工手册、保密协议、薪酬制度等）。${isManager ? "管理员可上传与版本替代" : "管理员上传"}`}
      headerIcon={<BookText className="h-5 w-5 text-primary" strokeWidth={1.8} />}
    />
  );
}
