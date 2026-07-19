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

export function useAutoTitleSuggestion({}: UseAutoTitleProps) {
  const { control, setValue } = useFormContext<IntakeCreateInput>();
  const watchedParties = useWatch({ control, name: "parties" });
  const watchedTitle = useWatch({ control, name: "title" });
  const watchedCauseFree = useWatch({ control, name: "causeFreeText" });

  const [titleTouched, setTitleTouched] = useState(false);
  const [causeName, setCauseName] = useState("");

  useEffect(() => {
    runAutoTitle(titleTouched, watchedParties, causeName, watchedCauseFree, watchedTitle, setValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedParties, causeName, watchedCauseFree, titleTouched, watchedTitle, setValue]);

  return { titleTouched, setTitleTouched, causeName, setCauseName };
}
