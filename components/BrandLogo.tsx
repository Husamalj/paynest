import React from "react";

/**
 * The PayNest brand logo (PN monogram + wordmark) built from the transparent
 * logo assets in /public. Use everywhere instead of the old building icon.
 */
export default function BrandLogo({
  variant = "stacked",
  markClass = "h-12",
  textClass = "h-6",
  showHr = false,
  className = "",
}: {
  variant?: "stacked" | "row";
  markClass?: string;
  textClass?: string;
  showHr?: boolean;
  className?: string;
}) {
  const inv = "object-contain dark:brightness-0 dark:invert";
  if (variant === "row") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <img src="/paynest-mark.png" alt="PayNest" className={`${markClass} w-auto ${inv}`} />
        <div className="flex flex-col">
          <img src="/paynest-text.png" alt="PayNest" className={`${textClass} w-auto ${inv}`} />
          {showHr && <img src="/paynest-hr.png" alt="HR & Payroll" className={`h-3.5 w-auto mt-1 ${inv}`} />}
        </div>
      </div>
    );
  }
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <img src="/paynest-mark.png" alt="PayNest" className={`${markClass} w-auto ${inv}`} />
      <img src="/paynest-text.png" alt="PayNest" className={`${textClass} w-auto ${inv}`} />
      {showHr && <img src="/paynest-hr.png" alt="HR & Payroll" className={`h-4 w-auto ${inv}`} />}
    </div>
  );
}
