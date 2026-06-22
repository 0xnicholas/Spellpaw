/**
 * FileUploadButton — 文件上传按钮：选中后读取文本内容，注入到消息框。
 *
 * 行为：
 *  - 限定常见文本类型（见 TEXT_EXT）
 *  - 大于 MAX_FILE_BYTES 的文本自动截断（避免撑爆 LLM context）
 *  - 二进制文件仅插入文件名标记，不读内容
 *  - onUpload 回调让 caller 拿到原始 File（用于 Lab 显示 chip / workspace 上传到后端）
 */
import { useRef } from 'react';
import { CirclePlus, X } from 'lucide-react';
import { IconButton } from '@/shared/components/ui/IconButton';
import { cn } from '@/shared/lib/utils';

const TEXT_EXT = /\.(txt|md|markdown|json|ya?ml|xml|csv|log|tsv|ini|conf|env|html|css|js|ts|tsx|jsx|py|go|rs|java|kt|swift|c|cpp|h|hpp|sh|bash|zsh|sql)$/i;
const MAX_FILE_BYTES = 200_000;

export interface UploadedFile {
  name: string;
  size: number;
  content: string | null;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// eslint-disable-next-line react-refresh/only-export-components
export function formatFileInsert(file: UploadedFile): string {
  if (file.content !== null) {
    return `[附件: ${file.name} (${formatBytes(file.size)})\n${file.content}\n/附件]`;
  }
  return `[附件: ${file.name} (${formatBytes(file.size)}, 非文本未读取)]`;
}

export interface FileUploadButtonProps {
  /** 文件读取完毕回调 —— caller 可以把 chip 显示出来 */
  onUpload?: (file: UploadedFile) => void;
  /** 自定义 aria-label */
  label?: string;
}

export function FileUploadButton({
  onUpload,
  label = '上传文件',
}: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    const isText = TEXT_EXT.test(file.name) || file.type.startsWith('text/') || file.type === 'application/json';
    let content: string | null = null;
    if (isText && file.size <= MAX_FILE_BYTES) {
      content = await file.text();
    } else if (isText) {
      content = await file.slice(0, MAX_FILE_BYTES).text();
    }
    const uploaded: UploadedFile = { name: file.name, size: file.size, content };
    onUpload?.(uploaded);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  return (
    <>
      <IconButton
        icon={<CirclePlus className="h-4 w-4" />}
        label={label}
        size="sm"
        onClick={() => fileInputRef.current?.click()}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={onChange}
        data-testid="copilot-file-input"
      />
    </>
  );
}

/** chip 显示组件：独立的小组件，谁需要谁用 */
export function UploadedFileChip({
  file,
  onClear,
}: {
  file: UploadedFile;
  onClear?: () => void;
}) {
  return (
    <span
      className={cn(
        'ml-1 inline-flex max-w-[140px] items-center gap-1 rounded-full border border-[var(--color-accent-300)] bg-[var(--color-accent-50)] px-2 py-0.5 text-[10px] text-[var(--color-accent-700)]',
      )}
      title={`${file.name} · ${formatBytes(file.size)}${file.content === null ? ' · 非文本未读取' : ''}`}
    >
      📎 <span className="truncate">{file.name}</span>
      {onClear && (
        <button
          onClick={onClear}
          className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--color-accent-100)]"
          aria-label="清除附件提示"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}