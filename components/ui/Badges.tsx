import { AlertTriangleIcon, CheckCircleIcon } from "@/components/icons";
import type { ReviewStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: ReviewStatus }) {
  if (status === "Flagged") {
    return (
      <span className="badge-danger">
        <AlertTriangleIcon size={12} />
        Flagged
      </span>
    );
  }
  return (
    <span className="badge-success">
      <CheckCircleIcon size={12} />
      Finalized
    </span>
  );
}

export function ConfidencePill({ value }: { value: number }) {
  const tone =
    value >= 85
      ? "badge-success"
      : value >= 65
        ? "badge-warning"
        : "badge-danger";
  return <span className={tone}>{value}%</span>;
}

export function YesNoBadge({ value }: { value: boolean }) {
  return value ? (
    <span className="badge-danger">Yes</span>
  ) : (
    <span className="badge-neutral">No</span>
  );
}
