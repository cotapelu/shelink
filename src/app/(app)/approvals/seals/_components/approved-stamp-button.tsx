"use client";

interface ApprovedStampButtonProps {
  onAction: (action: "stamp") => void;
}

export function ApprovedStampButton({ onAction }: ApprovedStampButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onAction("stamp")}
      className="text-[11px] text-primary hover:underline"
    >
      回填盖章件
    </button>
  );
}
