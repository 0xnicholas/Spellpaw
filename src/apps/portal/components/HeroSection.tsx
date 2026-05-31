import { ArrowRight, Wand2, Sparkles, Upload, FileText, Clapperboard, X, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type DramaType = 'single' | 'series';
type WriterMode = 'pro' | 'high' | 'xhigh';

const writerModeConfig: Record<WriterMode, { label: string; desc: string }> = {
  pro: { label: '编剧 Pro', desc: '标准模式' },
  high: { label: '编剧 High', desc: '深度创作' },
  xhigh: { label: '编剧 xHigh', desc: '极致体验' },
};

export function HeroSection() {
  const [prompt, setPrompt] = useState('');
  const [dramaType, setDramaType] = useState<DramaType>('single');
  const [writerMode, setWriterMode] = useState<WriterMode>('pro');
  const [writerDropdownOpen, setWriterDropdownOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setWriterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreate = () => {
    navigate('/projects');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedFile(file);
  };

  const clearFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <section className="relative flex min-h-[auto] items-center justify-center overflow-hidden py-12 pt-24 sm:min-h-[85vh]">
      {/* Aurora flowing background */}
      <div className="absolute inset-0 bg-[var(--color-bg-primary)]" />

      {/* Flowing aurora bands */}
      <div className="absolute -left-[10%] -top-[10%] h-[700px] w-[900px] animate-[aurora-1_14s_ease-in-out_infinite] rounded-full bg-purple-500/8 blur-[160px] dark:bg-purple-500/15" />
      <div className="absolute -right-[5%] top-[5%] h-[600px] w-[800px] animate-[aurora-2_18s_ease-in-out_infinite] rounded-full bg-cyan-500/6 blur-[140px] dark:bg-cyan-500/12" />
      <div className="absolute left-[10%] -bottom-[5%] h-[500px] w-[700px] animate-[aurora-3_16s_ease-in-out_infinite] rounded-full bg-pink-500/6 blur-[150px] dark:bg-pink-500/10" />

      {/* Vignette for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,_transparent_40%,_var(--color-bg-primary)_100%)]" />

      {/* Subtle flowing grid */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `linear-gradient(var(--color-accent-500) 1px, transparent 1px), linear-gradient(90deg, var(--color-accent-500) 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl px-6">
        {/* Badge */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-accent-500)]/20 bg-[var(--color-accent-500)]/5 px-4 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent-500)]" />
            <span className="text-xs font-medium text-[var(--color-accent-500)]">
              AI 驱动的短剧创作平台
            </span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="mb-3 text-center text-4xl font-bold leading-[1.1] tracking-tight text-[var(--color-text-primary)] sm:text-5xl">
          用 AI 打造你的
          <br />
          <span className="bg-gradient-to-r from-[#5b21ff] to-[#a855f7] bg-clip-text text-transparent">
            下一个爆款短剧
          </span>
        </h1>

        <p className="mb-10 text-center text-base leading-relaxed text-[var(--color-text-secondary)] sm:text-lg">
          输入创意或上传剧本，AI 自动生成剧本、分镜和拍摄方案
        </p>

        {/* Unified Input Panel */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] shadow-xl shadow-[var(--color-accent-500)]/5">
          {/* Textarea */}
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="输入你的短剧创意..."
              className="min-h-[140px] w-full resize-none rounded-t-[var(--radius-lg)] bg-transparent px-5 pt-4 text-[15px] leading-relaxed text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)]"
            />
            {prompt.length > 0 && (
              <div className="absolute bottom-2 right-4 text-[10px] text-[var(--color-text-tertiary)]">
                {prompt.length}
              </div>
            )}
          </div>

          {/* Bottom toolbar — all controls in one row */}
          <div className="flex items-center gap-2 border-t border-[var(--color-border-default)] px-4 py-3">
            {/* Left: Upload */}
            <div className="flex items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,.doc,.docx,.md"
                onChange={handleFileChange}
                className="hidden"
              />
              {uploadedFile ? (
                <div className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-accent-50)] px-2.5 py-1 text-xs text-[var(--color-accent-600)]">
                  <FileText className="h-3 w-3" />
                  <span className="max-w-[120px] truncate">{uploadedFile.name}</span>
                  <button onClick={clearFile} className="ml-0.5 hover:text-[var(--color-accent-700)]">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-xs text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-secondary)]"
                >
                  <Upload className="h-3 w-3" />
                  上传剧本/小说
                </button>
              )}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right: Drama Type */}
            <div className="flex items-center rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] p-0.5">
              <button
                onClick={() => setDramaType('single')}
                className={`flex items-center gap-1 rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium transition-all ${
                  dramaType === 'single'
                    ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm'
                    : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
                }`}
              >
                <Clapperboard className="h-3 w-3" />
                单剧
              </button>
              <button
                onClick={() => setDramaType('series')}
                className={`flex items-center gap-1 rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium transition-all ${
                  dramaType === 'series'
                    ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm'
                    : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
                }`}
              >
                <FileText className="h-3 w-3" />
                连续剧
              </button>
            </div>

            {/* Divider */}
            <div className="h-4 w-px bg-[var(--color-border-default)]" />

            {/* Right: Writer Mode Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setWriterDropdownOpen(!writerDropdownOpen)}
                className="flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
              >
                {writerModeConfig[writerMode].label}
                <ChevronDown className={`h-3 w-3 transition-transform ${writerDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {writerDropdownOpen && (
                <div className="absolute bottom-full right-0 mb-1 w-36 rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] py-1 shadow-lg">
                  {(['pro', 'high', 'xhigh'] as WriterMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setWriterMode(mode);
                        setWriterDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors ${
                        writerMode === mode
                          ? 'bg-[var(--color-accent-50)] text-[var(--color-accent-600)]'
                          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
                      }`}
                    >
                      <span className="font-medium">{writerModeConfig[mode].label}</span>
                      <span className="text-[10px] text-[var(--color-text-tertiary)]">{writerModeConfig[mode].desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Create Button */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleCreate}
            className="group flex items-center gap-2 rounded-[var(--radius-base)] bg-gradient-to-r from-[#5b21ff] to-[#a855f7] px-8 py-3 text-base font-semibold text-white shadow-lg shadow-[#5b21ff]/20 transition-all hover:from-[#4c1ad9] hover:to-[#9646e5] hover:shadow-[#5b21ff]/30"
          >
            <Wand2 className="h-5 w-5" />
            开始创作
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Quick examples */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-[var(--color-text-tertiary)]">试试：</span>
          {['都市奇缘', '密室逃脱', '逆袭人生', '校园恋爱'].map((item) => (
            <button
              key={item}
              onClick={() => setPrompt(item)}
              className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-bg-primary)]/80 px-3 py-1 text-xs text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-accent-500)]/30 hover:text-[var(--color-accent-500)]"
            >
              {item}
            </button>
          ))}
        </div>


      </div>
    </section>
  );
}
