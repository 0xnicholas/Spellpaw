/**
 * useSkills — React hook over the shared skill loader.
 *
 * Returns `{ skills, isLoading }` and triggers a re-render whenever
 * `ensureSkillsLoaded` settles. Use this in any component that needs
 * to react to the loader state (e.g. show a skeleton while loading).
 *
 * The hook does not call `ensureSkillsLoaded` itself — that is owned
 * by `main.tsx` bootstrap so the app doesn't double-fetch.
 */
import { useEffect, useState } from 'react';
import {
  getSkills,
  isSkillsLoading,
  subscribeToSkills,
} from './loader';
import type { Skill } from './types';

export interface UseSkillsResult {
  skills: readonly Skill[];
  isLoading: boolean;
}

export function useSkills(): UseSkillsResult {
  const [skills, setSkills] = useState<readonly Skill[]>(getSkills());
  const [isLoading, setIsLoading] = useState<boolean>(isSkillsLoading());

  useEffect(() => {
    // Re-read once on mount in case the loader settled between render
    // and effect — avoids a stale initial frame.
    setSkills(getSkills());
    setIsLoading(isSkillsLoading());

    return subscribeToSkills(() => {
      setSkills(getSkills());
      setIsLoading(isSkillsLoading());
    });
  }, []);

  return { skills, isLoading };
}