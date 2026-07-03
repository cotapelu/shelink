// @ts-nocheck
"use client";

import { Button } from "@/components/ui/button";
import { Field } from "./field";
import { CauseCombobox } from "./cause-combobox";
import { CauseRecommendationDialog } from "./cause-recommendation-dialog";
import { CauseAiManualDialog } from "./cause-ai-manual-dialog";
import { ScanLine, Sparkles } from "lucide-react";
import type { UseFormSetValue } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import type { IntakeCreateInput } from "@/server/intakes/schemas";
import type { MatterCategory } from "@prisma/client";

interface CauseSectionProps {
  category: MatterCategory;
  causeId?: string;
  setValue: UseFormSetValue<IntakeCreateInput>;
  errors: FieldErrors;
}

export function CauseSection({ category, causeId, setValue, errors }: CauseSectionProps) {
  return (
    <Field label="案由" required error={errors.causeId?.message}>
      <div className="flex gap-2">
        <div className="flex-1">
          <CauseCombobox
            category={category}
            value={causeId || ""}
            onChange={(id, name) => {
              setValue("causeId", id, { shouldDirty: true });
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {/* open AI recommendation dialog */}}
          className="gap-1.5"
        >
          <Sparkles className="h-4 w-4" />
          AI推荐
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {/* open manual dialog */}}
          className="gap-1.5"
        >
          <ScanLine className="h-4 w-4" />
          手动选择
        </Button>
      </div>
    </Field>
  );
}
