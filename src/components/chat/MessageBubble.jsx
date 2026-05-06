import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  GraduationCap,
  Loader2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

function FunctionDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const name = toolCall?.name || "Function";
  const status = toolCall?.status || "pending";
  const details =
    toolCall?.arguments ?? toolCall?.result ?? toolCall?.output ?? null;

  const statusConfig = {
    pending: { icon: Clock, color: "text-slate-400", text: "Pending" },
    running: {
      icon: Loader2,
      color: "text-slate-500",
      text: "Searching...",
      spin: true,
    },
    in_progress: {
      icon: Loader2,
      color: "text-slate-500",
      text: "Thinking...",
      spin: true,
    },
    completed: { icon: CheckCircle2, color: "text-green-600", text: "Done" },
    success: { icon: CheckCircle2, color: "text-green-600", text: "Done" },
    failed: { icon: AlertCircle, color: "text-red-500", text: "Failed" },
    error: { icon: AlertCircle, color: "text-red-500", text: "Failed" },
  }[status] || { icon: Zap, color: "text-slate-500", text: "" };

  const Icon = statusConfig.icon;

  return (
    <div className="mt-2 text-xs">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 transition-all hover:bg-slate-50 dark:border-[#314062] dark:bg-[#18213A] dark:hover:bg-[#202B47]"
      >
        <Icon
          className={cn(
            "h-3 w-3",
            statusConfig.color,
            statusConfig.spin && "animate-spin",
          )}
        />
        <span className="text-slate-600 dark:text-slate-200">
          {name.split(".").reverse().join(" ")}
        </span>
        {statusConfig.text ? (
          <span className="text-slate-400 dark:text-slate-400">• {statusConfig.text}</span>
        ) : null}
        {!statusConfig.spin ? (
          <ChevronRight
            className={cn(
              "h-3 w-3 text-slate-400 transition-transform",
              expanded && "rotate-90",
            )}
          />
        ) : null}
      </button>

      {expanded && details ? (
        <pre className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 dark:border-[#314062] dark:bg-[#141D32] dark:text-slate-300">
          {typeof details === "string" ? details : JSON.stringify(details, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message?.role === "user";

  const handleCopy = async () => {
    if (!message?.content) {
      return;
    }

    try {
      await navigator.clipboard.writeText(message.content);
      toast.success("Message copied");
    } catch {
      toast.error("Could not copy the message");
    }
  };

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser ? (
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1E5EFF] to-[#6366F1]">
          <GraduationCap className="h-4 w-4 text-white" />
        </div>
      ) : null}

      <div className={cn("max-w-[85%]", isUser && "flex flex-col items-end")}>
        {message?.content ? (
          <div
            className={cn(
              "rounded-2xl px-4 py-3",
              isUser
                ? "bg-[#1E5EFF] text-white"
                : "border border-slate-200 bg-white shadow-sm dark:border-[#2D3958] dark:bg-[#151F35] dark:shadow-[0_18px_45px_-32px_rgba(15,23,42,0.9)]",
            )}
          >
            {!isUser ? (
              <div className="mb-2 flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-[#202A45] dark:hover:text-slate-100"
                  onClick={handleCopy}
                  aria-label="Copy message"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : null}

            {isUser ? (
              <p className="text-sm leading-relaxed">{message.content}</p>
            ) : (
              <ReactMarkdown
                className="prose prose-sm max-w-none text-sm prose-slate [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={{
                  p: ({ children }) => (
                    <p className="my-2 leading-7 text-slate-700 dark:text-slate-200">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="my-3 ml-5 list-disc space-y-2">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="my-3 ml-5 list-decimal space-y-3">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-slate-700 marker:font-semibold dark:text-slate-200">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-slate-900 dark:text-slate-50">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 not-italic dark:text-slate-400">
                      {children}
                    </em>
                  ),
                  code: ({ inline, children }) =>
                    inline ? (
                      <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-700 dark:bg-[#202B45] dark:text-slate-100">
                        {children}
                      </code>
                    ) : (
                      <pre className="my-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-slate-100 dark:bg-[#1C2742]">
                        <code>{children}</code>
                      </pre>
                    ),
                }}
              >
                {message.localizedContent?.primary || message.content}
              </ReactMarkdown>
            )}
          </div>
        ) : null}

        {!isUser && message?.localizedContent?.secondary ? (
          <div className="mt-2 rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-2 text-xs leading-6 text-slate-500 dark:border-[#2D3958] dark:bg-[#10182B] dark:text-slate-400">
            {message.localizedContent.secondary}
          </div>
        ) : null}

        {message?.tool_calls?.length > 0 ? (
          <div className="space-y-1">
            {message.tool_calls.map((toolCall, index) => (
              <FunctionDisplay key={index} toolCall={toolCall} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
