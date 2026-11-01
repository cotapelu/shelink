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
 * Hook to auto-generate intake title based on client and opposing party names + cause.
 * Rules: if user hasn't manually edited title, suggest "ClientVsOpponent Cause" without spaces.
 */
function buildAutoTitle(client: string | undefined, opponent: string | undefined, cause: string) {
  return `${client ?? ""}${opponent ? `与${opponent}` : ""}${cause}`.replace(/\s+/g, "");
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
