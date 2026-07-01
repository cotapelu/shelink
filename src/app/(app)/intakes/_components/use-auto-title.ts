'use client';

import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { IntakeCreateInput } from '@/server/intakes/schemas';

interface UseAutoTitleProps {
  // No need to pass setValue; hook only sets title
}

/**
 * Hook to auto-generate intake title based on client and opposing party names + cause.
 * Rules: if user hasn't manually edited title, suggest "ClientVsOpponent Cause" without spaces.
 */
export function useAutoTitleSuggestion({}: UseAutoTitleProps) {
  const methods = useFormContext<IntakeCreateInput>();
  const { control, setValue } = methods;
  
  const watchedParties = useWatch({ control, name: "parties" });
  const watchedTitle = useWatch({ control, name: "title" });
  const watchedCauseFree = useWatch({ control, name: "causeFreeText" });
  
  const [titleTouched, setTitleTouched] = useState(false);
  const [causeName, setCauseName] = useState("");

  useEffect(() => {
    if (titleTouched) return;
    const list = (watchedParties ?? []) as { role?: string; name?: string }[];
    const clientNm = list.find((p) => p.role === "CLIENT_PARTY")?.name?.trim();
    const oppNm = list.find((p) => p.role === "OPPOSING_PARTY")?.name?.trim();
    const causeNm = (causeName || watchedCauseFree || "").trim();
    if (!clientNm && !oppNm) return;
    const suggested = `${clientNm ?? ""}${oppNm ? `与${oppNm}` : ""}${causeNm}`.replace(/\s+/g, "");
    if (suggested && suggested !== (watchedTitle ?? "")) {
      setValue("title", suggested, { shouldDirty: true });
    }
  }, [watchedParties, causeName, watchedCauseFree, titleTouched, watchedTitle, setValue]);

  return {
    titleTouched,
    setTitleTouched,
    causeName,
    setCauseName,
  };
}
