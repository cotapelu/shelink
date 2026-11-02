'use client';

import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { Control, UseFormSetValue } from 'react-hook-form';
import type { IntakeCreateInput } from '@/server/intakes/schemas';

interface UseAutoTitleProps {
  /**
   * Form control/setter có thể truyền trực tiếp. Cần thiết khi component gọi hook
   * NGOÀI <FormProvider> (vd: IntakeSheet tạo form rồi render provider trong JSX).
   * Nếu không truyền, fallback về useFormContext (mặc định).
   */
  control?: Control<IntakeCreateInput>;
  setValue?: UseFormSetValue<IntakeCreateInput>;
}

/**
 * Hook tự sinh tiêu đề tiếp nhận theo tên khách hàng + bên đối phương + nguyên nhân.
 * Quy tắc: nếu người dùng chưa tự sửa tiêu đề, gợi ý "Khách hàng và Bên đối phương - Nguyên nhân".
 */
function buildAutoTitle(client: string | undefined, opponent: string | undefined, cause: string) {
  const c = (client ?? "").trim();
  const o = (opponent ?? "").trim();
  const cz = (cause ?? "").trim();
  const parts = [c];
  if (o) parts.push(`và ${o}`);
  const head = parts.join(" ");
  return cz ? `${head} - ${cz}` : head;
}
function extractNames(
  list: { role?: string; name?: string }[]
): { client?: string; opponent?: string } {
  const client = list.find(p => p.role === "CLIENT_PARTY")?.name?.trim();
  const opponent = list.find(p => p.role === "OPPOSING_PARTY")?.name?.trim();
  return { client, opponent };
}

function runAutoTitle(
  titleTouched: boolean,
  watchedParties: any,
  causeName: string,
  watchedCauseFree: any,
  watchedTitle: any,
  setValue: any
): void {
  if (titleTouched) return;
  const { client, opponent } = extractNames((watchedParties ?? []) as any);
  const cause = (causeName || watchedCauseFree || "").trim();
  if (!client && !opponent) return;
  const suggested = buildAutoTitle(client, opponent, cause);
  if (suggested && suggested !== (watchedTitle ?? "")) {
    setValue("title", suggested, { shouldDirty: true });
  }
}

export function useAutoTitleSuggestion(props: UseAutoTitleProps = {}) {
  const context = useFormContext<IntakeCreateInput>();
  // Ưu tiên props (component ngoài FormProvider), fallback context
  const control = props.control ?? context?.control;
  const setValue = (props.setValue ?? context?.setValue) as UseFormSetValue<IntakeCreateInput> | undefined;
  const watchedParties = useWatch({ control, name: "parties" });
  const watchedTitle = useWatch({ control, name: "title" });
  const watchedCauseFree = useWatch({ control, name: "causeFreeText" });

  const [titleTouched, setTitleTouched] = useState(false);
  const [causeName, setCauseName] = useState("");

  useEffect(() => {
    if (!setValue) return; // không có form context/props thì bỏ qua auto-title
    runAutoTitle(titleTouched, watchedParties, causeName, watchedCauseFree, watchedTitle, setValue);
  }, [watchedParties, causeName, watchedCauseFree, titleTouched, watchedTitle, setValue]);

  return { titleTouched, setTitleTouched, causeName, setCauseName };
}
