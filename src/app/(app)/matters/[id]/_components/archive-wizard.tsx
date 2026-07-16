"use client";

import { useRouter } from "next/navigation";
import { useArchiveWizard } from "./use-archive-wizard";
import { ArchiveWizardHeader } from "./archive-wizard-header";
import { ArchiveBasicInfoStep } from "./archive-basic-info-step";
import { ArchiveChecklistStep } from "./archive-checklist-step";
import { ArchiveForceMissingCheckbox } from "./archive-force-missing-checkbox";
import { ArchiveWizardFooter } from "./archive-wizard-footer";
import { useState } from "react";

interface Props {
  matterId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ArchiveWizardDialog({ matterId, open, onOpenChange }: Props) {
  const router = useRouter();
  const {
    loading,
    checklist,
    checked,
    closedReason,
    completedAt,
    summary,
    setSummary,
    setClosedReason,
    setCompletedAt,
    forceWithMissing,
    setForceWithMissing,
    isPending,
    uploadingItemId,
    triggerUpload,
    missingRequired,
    handleSubmit
  } = useArchiveWizard({ matterId });

  const totalSteps = 2;
  const [step, setStep] = useState(0);

  return (
    <ArchiveWizardHeader open={open} onOpenChange={onOpenChange} step={step} totalSteps={totalSteps}>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <>
          {step === 0 && (
            <ArchiveBasicInfoStep
              closedReason={closedReason}
              completedAt={completedAt}
              summary={summary}
              judgmentSummary=""
              onClosedReasonChange={setClosedReason}
              onCompletedAtChange={setCompletedAt}
              onSummaryChange={setSummary}
              onJudgmentSummaryChange={() => {}}
            />
          )}
          {step === 1 && (
            <div className="space-y-4">
              <ArchiveChecklistStep
                checklist={checklist?.items ?? []}
                uploadedCount={0}
                totalCount={checklist?.items.length ?? 0}
                onUpload={triggerUpload}
                uploading={!!uploadingItemId}
              />
              <ArchiveForceMissingCheckbox
                checked={forceWithMissing}
                onChange={setForceWithMissing}
                missingCount={missingRequired.length}
              />
            </div>
          )}
        </>
      )}
      <ArchiveWizardFooter
        step={step}
        totalSteps={totalSteps}
        onNext={() => setStep(s => s + 1)}
        onBack={() => setStep(s => s - 1)}
        onSubmit={handleSubmit}
        isPending={isPending}
        canProceed={step === 0 ? summary.trim() !== "" : missingRequired.length === 0 || forceWithMissing}
      />
    </ArchiveWizardHeader>
  );
}

import { Loader2 } from "lucide-react";
