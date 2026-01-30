import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Skeleton loader displayed while waiting for generation API response.
 * Mimics the structure of the flashcard list (cards with front/back placeholders).
 */
function SkeletonLoader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton-loader"
      className={cn("space-y-4", className)}
      role="status"
      aria-label="Ładowanie propozycji fiszek"
      {...props}
    >
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <span className="sr-only">Oczekiwanie na odpowiedź API...</span>
    </div>
  );
}

export { SkeletonLoader };
