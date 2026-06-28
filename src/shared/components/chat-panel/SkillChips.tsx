/**
 * SkillChips — quick-pick chips for Copilot skills.
 *
 * Clicking a chip inserts the slash command into the chat input.
 * Skills are higher-level workflows (vs the QuickActions chips which
 * send a freeform prompt to the LLM).
 *
 * Uses the shared `useSkills` hook internally — the parent just needs
 * to provide `onInsert`. The hook handles loading state, so the chips
 * row degrades gracefully while the manifest is still in flight.
 */
import { useTranslation } from 'react-i18next';
import { Sparkles, Loader2 } from 'lucide-react';
import { useSkills } from '@shared/copilot/skills/useSkills';

interface SkillChipsProps {
  /** Called when a skill chip is clicked. The string is the slash command with leading slash. */
  onInsert: (slashCommand: string) => void;
}

export function SkillChips({ onInsert }: SkillChipsProps) {
  const { t } = useTranslation();
  const { skills, isLoading } = useSkills();

  // Loading state: show a single disabled placeholder chip so the row
  // doesn't pop in suddenly when the manifest arrives.
  if (isLoading) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5">
        <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)]">
          <Sparkles className="h-3 w-3" />
          {t('common.skills', { defaultValue: 'Build a Story' })}
        </span>
        <span
          data-testid="skill-loading"
          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-2 py-0.5 text-[10px] text-[var(--color-text-tertiary)]"
        >
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
          loading…
        </span>
      </div>
    );
  }

  // Loaded but empty: render the row without chips (rare — only happens
  // when the manifest fetched successfully but listed zero skills).
  if (skills.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5">
        <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)]">
          <Sparkles className="h-3 w-3" />
          {t('common.skills', { defaultValue: 'Build a Story' })}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5">
      <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)]">
        <Sparkles className="h-3 w-3" />
        {t('common.skills', { defaultValue: 'Build a Story' })}
      </span>
      {skills.map((skill) => (
        <button
          key={skill.id}
          onClick={() => onInsert(`/${skill.slashCommand}`)}
          title={skill.description}
          className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-2 py-0.5 text-[10px] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent-500)] hover:text-[var(--color-accent-500)]"
        >
          /{skill.slashCommand}
        </button>
      ))}
    </div>
  );
}