/**
 * SkillChips — quick-pick chips for built-in Copilot skills.
 *
 * Clicking a chip inserts the slash command into the chat input.
 * Skills are higher-level workflows (vs the QuickActions chips which
 * send a freeform prompt to the LLM).
 */
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { getAllSkills } from '@drama/lib/skills/registry';

interface SkillChipsProps {
  /** Called when a skill chip is clicked. The string is the slash command with leading slash. */
  onInsert: (slashCommand: string) => void;
}

export function SkillChips({ onInsert }: SkillChipsProps) {
  const { t } = useTranslation();
  const skills = getAllSkills();

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5">
      <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)]">
        <Sparkles className="h-3 w-3" />
        {t('common.skills', { defaultValue: 'Skills' })}
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
