import { useState, useMemo } from 'react';
import { AlertTriangle, Info, ChevronDown, ChevronUp, BarChart3, Clock, Layers, Activity } from 'lucide-react';
import { generatePacingReport, type PacingReport } from '@drama/lib/projectAnalysis';
import type { TreeNode } from '@drama/types';

interface AnalysisReportProps {
  tree: TreeNode;
}

export function AnalysisReport({ tree }: AnalysisReportProps) {
  const [expanded, setExpanded] = useState(true);
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  const report: PacingReport = useMemo(() => generatePacingReport(tree), [tree]);

  if (report.sceneCount === 0) {
    return (
      <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border-default)] p-3 text-center">
        <p className="text-[11px] text-[var(--color-text-tertiary)]">暂无场景数据，添加场景后可查看节奏分析</p>
      </div>
    );
  }

  const statusConfig = {
    good: { label: '节奏良好', color: 'text-[var(--color-success-500)]', bg: 'bg-[var(--color-success-50)]', border: 'border-[var(--color-success-200)]' },
    warning: { label: '需注意', color: 'text-[var(--color-warning-500)]', bg: 'bg-[var(--color-warning-50)]', border: 'border-[var(--color-warning-200)]' },
    critical: { label: '节奏失衡', color: 'text-[var(--color-error-500)]', bg: 'bg-[var(--color-error-50)]', border: 'border-[var(--color-error-200)]' },
  };
  const status = statusConfig[report.overallStatus];

  const maxBarDuration = Math.max(1, ...report.durationBars.map((b) => b.duration));
  const displayIssues = showAllIssues ? report.issues : report.issues.slice(0, 3);
  const displaySuggestions = showAllSuggestions ? report.suggestions : report.suggestions.slice(0, 3);

  return (
    <div className="rounded-[var(--radius-base)] border border-[var(--color-border-default)] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-[var(--color-bg-secondary)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-[var(--color-accent-500)]" />
          <span className="text-xs font-medium text-[var(--color-text-primary)]">智能分析</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${status.bg} ${status.color} ${status.border} border`}>
            {status.label}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Key metrics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-[var(--color-text-tertiary)]">
                <Clock className="h-3 w-3" />
              </div>
              <div className="mt-0.5 text-sm font-semibold text-[var(--color-text-primary)]">{report.totalDuration}s</div>
              <div className="text-[10px] text-[var(--color-text-tertiary)]">总时长</div>
            </div>
            <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-[var(--color-text-tertiary)]">
                <Layers className="h-3 w-3" />
              </div>
              <div className="mt-0.5 text-sm font-semibold text-[var(--color-text-primary)]">{report.sceneCount}</div>
              <div className="text-[10px] text-[var(--color-text-tertiary)]">场景</div>
            </div>
            <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-[var(--color-text-tertiary)]">
                <BarChart3 className="h-3 w-3" />
              </div>
              <div className="mt-0.5 text-sm font-semibold text-[var(--color-text-primary)]">{Math.round(report.avgSceneDuration)}s</div>
              <div className="text-[10px] text-[var(--color-text-tertiary)]">平均</div>
            </div>
          </div>

          {/* Duration distribution bars */}
          {report.durationBars.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-medium text-[var(--color-text-secondary)]">时长分布</span>
                <span className="text-[10px] text-[var(--color-text-tertiary)]">
                  σ = {report.durationStdDev.toFixed(1)}s
                </span>
              </div>
              <div className="space-y-1">
                {report.durationBars.map((bar) => (
                  <div key={bar.nodeId} className="flex items-center gap-2">
                    <span className="w-16 truncate text-[10px] text-[var(--color-text-secondary)]" title={bar.title}>
                      {bar.title}
                    </span>
                    <div className="flex-1 h-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] overflow-hidden">
                      <div
                        className="h-full rounded-[var(--radius-sm)] transition-all"
                        style={{
                          width: `${(bar.duration / maxBarDuration) * 100}%`,
                          backgroundColor: `var(${bar.color})`,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                    <span className="w-8 text-right text-[10px] font-medium text-[var(--color-text-primary)]">{bar.duration}s</span>
                  </div>
                ))}
              </div>
              {/* Legend */}
              {report.actCount > 1 && (
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {Array.from(new Set(report.durationBars.map((b) => b.actTitle))).map((title, i) => (
                    <span key={title} className="flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)]">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: `var(${ACT_COLORS[i % ACT_COLORS.length].replace('var(', '').replace(')', '')})`,
                        }}
                      />
                      {title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Issues */}
          {report.issues.length > 0 && (
            <div>
              <div className="mb-1.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
                节奏预警 ({report.issues.length})
              </div>
              <div className="space-y-1">
                {displayIssues.map((issue, i) => (
                  <div
                    key={`${issue.nodeId}-${i}`}
                    className={`flex items-start gap-1.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-[11px] ${
                      issue.severity === 'warning'
                        ? 'bg-[var(--color-error-50)] text-[var(--color-error-600)]'
                        : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {issue.severity === 'warning' ? (
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    ) : (
                      <Info className="mt-0.5 h-3 w-3 shrink-0" />
                    )}
                    <span>{issue.message}</span>
                  </div>
                ))}
              </div>
              {report.issues.length > 3 && (
                <button
                  onClick={() => setShowAllIssues(!showAllIssues)}
                  className="mt-1 text-[10px] text-[var(--color-accent-500)] hover:underline"
                >
                  {showAllIssues ? '收起' : `查看全部 ${report.issues.length} 条`}
                </button>
              )}
            </div>
          )}

          {/* Suggestions */}
          {report.suggestions.length > 0 && (
            <div>
              <div className="mb-1.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
                结构建议 ({report.suggestions.length})
              </div>
              <div className="space-y-1">
                {displaySuggestions.map((s, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-1.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-[11px] ${
                      s.severity === 'warning'
                        ? 'bg-[var(--color-warning-50)] text-[var(--color-warning-600)]'
                        : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    <Info className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>{s.message}</span>
                  </div>
                ))}
              </div>
              {report.suggestions.length > 3 && (
                <button
                  onClick={() => setShowAllSuggestions(!showAllSuggestions)}
                  className="mt-1 text-[10px] text-[var(--color-accent-500)] hover:underline"
                >
                  {showAllSuggestions ? '收起' : `查看全部 ${report.suggestions.length} 条`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const ACT_COLORS = [
  '--color-accent-500',
  '--color-success-500',
  '--color-warning-500',
  '--color-info-500',
];
