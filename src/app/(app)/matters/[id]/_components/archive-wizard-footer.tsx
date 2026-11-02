"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ArchiveWizardFooterProps {
  step: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  isPending: boolean;
  canProceed: boolean;
}

export function ArchiveWizardFooter({
  step,
  totalSteps,
  onNext,
  onBack,
  onSubmit,
  isPending,
  canProceed
}: ArchiveWizardFooterProps) {
  const isLast = step === totalSteps - 1;

  return (
    <div className="flex justify-between">
      <Button variant="outline" onClick={onBack} disabled={step === 0 || isPending}>
        Quay lại
      </Button>
      {isLast ? (
        <Button onClick={onSubmit} disabled={!canProceed || isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Gửi lưu trữ
        </Button>
      ) : (
        <Button onClick={onNext} disabled={!canProceed || isPending}>
          Tiếp theo
        </Button>
      )}
    </div>
  );
}
