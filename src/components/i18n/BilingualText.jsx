import { cn } from "@/lib/utils";

export default function BilingualText({
  content,
  primaryClassName,
  secondaryClassName,
  className,
}) {
  if (!content?.primary) {
    return null;
  }

  return (
    <span className={cn("block", className)}>
      <span className={cn("block", primaryClassName)}>{content.primary}</span>
      {content.secondary ? (
        <span className={cn("mt-1 block text-xs opacity-70", secondaryClassName)}>
          {content.secondary}
        </span>
      ) : null}
    </span>
  );
}
