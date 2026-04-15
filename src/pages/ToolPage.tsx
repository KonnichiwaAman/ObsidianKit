import { useEffect, Suspense } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";
import { getToolById } from "@/data/tools";
import { getCategoryById } from "@/data/categories";
import { ToolErrorBoundary } from "@/components/ToolErrorBoundary";
import toolRegistry from "@/tools";

function ToolLoader() {
  return (
    <div className="flex min-h-[300px] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
    </div>
  );
}

function ToolPlaceholder() {
  return (
    <div
      className="flex min-h-[400px] flex-col items-center justify-center
                  rounded-2xl border-2 border-dashed border-[var(--color-border-primary)]
                  bg-[var(--color-bg-card)] p-10 text-center"
    >
      <Upload className="mb-4 h-10 w-10 text-[var(--color-text-muted)]" />
      <p className="text-sm font-medium text-[var(--color-text-secondary)]">
        This tool is coming soon
      </p>
      <p className="mt-2 text-xs text-[var(--color-text-muted)]">
        We're working on building this tool. Check back later!
      </p>
    </div>
  );
}

export function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>();

  const tool = toolId ? getToolById(toolId) : undefined;
  const category = tool ? getCategoryById(tool.categoryId) : undefined;
  const ToolComponent = toolId ? toolRegistry[toolId] ?? null : null;

  useEffect(() => {
    document.title = tool
      ? `${tool.name} — ObsidianKit`
      : "Tool Not Found — ObsidianKit";
  }, [tool]);

  if (!tool) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Tool not found
        </h1>
        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)]
                     transition-colors hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    );
  }

  const Icon = tool.icon;

  return (
    <div className="mx-auto max-w-4xl py-8 pl-[max(1rem,var(--safe-area-left))] pr-[max(1rem,var(--safe-area-right))] sm:px-6 sm:py-10 lg:px-8">
      {/* Back link */}
      {category && (
        <Link
          to={category.path}
          className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)]
                     transition-colors duration-200 hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {category.name}
        </Link>
      )}

      {/* Tool Header */}
      <div className="mt-5 flex items-start gap-3.5 sm:mt-6 sm:items-center sm:gap-4">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
                      border border-[var(--color-border-primary)] bg-[var(--color-bg-card)]
                      text-[var(--color-text-secondary)] sm:h-12 sm:w-12"
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)] sm:text-xl">
            {tool.name}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {tool.description}
          </p>
        </div>
      </div>

      {/* Tool Content */}
      <div className="mt-6 sm:mt-8">
        <ToolErrorBoundary resetKey={tool.id}>
          {ToolComponent ? (
            <Suspense fallback={<ToolLoader />}>
              <ToolComponent />
            </Suspense>
          ) : (
            <ToolPlaceholder />
          )}
        </ToolErrorBoundary>
      </div>

      {/* Privacy Notice */}
      <div className="mt-5 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-4 py-3.5 sm:mt-6 sm:px-5 sm:py-4">
        <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
          <span className="font-medium text-[var(--color-text-secondary)]">Privacy:</span>{" "}
          This tool runs entirely in your browser. Your files never leave your device.
          No data is sent to any server.
        </p>
      </div>
    </div>
  );
}
