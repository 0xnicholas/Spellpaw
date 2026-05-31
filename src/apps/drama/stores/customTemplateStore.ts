import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NarrativeTemplate } from '@drama/types';
import { validateTemplate } from '@drama/lib/templateExportImport';

interface CustomTemplateState {
  templates: NarrativeTemplate[];
  addTemplate: (template: NarrativeTemplate) => void;
  removeTemplate: (id: string) => void;
  updateTemplate: (id: string, updates: Partial<NarrativeTemplate>) => void;
  getTemplateById: (id: string) => NarrativeTemplate | undefined;
  importFromFile: (file: File) => Promise<NarrativeTemplate>;
}

export const useCustomTemplateStore = create<CustomTemplateState>()(
  persist(
    (set, get) => ({
      templates: [],

      addTemplate: (template) =>
        set((state) => {
          const exists = state.templates.some((t) => t.id === template.id);
          if (exists) {
            return {
              templates: state.templates.map((t) =>
                t.id === template.id ? template : t
              ),
            };
          }
          return { templates: [...state.templates, template] };
        }),

      removeTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        })),

      updateTemplate: (id, updates) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),

      getTemplateById: (id) => {
        return get().templates.find((t) => t.id === id);
      },

      importFromFile: (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const text = reader.result as string;
              const json = JSON.parse(text);
              const template = validateTemplate(json);
              get().addTemplate(template);
              resolve(template);
            } catch (err) {
              reject(err instanceof Error ? err : new Error(String(err)));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsText(file);
        });
      },
    }),
    {
      name: 'spellpaw_custom_templates',
      partialize: (state) => ({ templates: state.templates }) as unknown as CustomTemplateState,
    }
  )
);
