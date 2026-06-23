/**
 * HeroSearchBar — Portal hero 中心的 prompt 输入。
 *
 * 仅一个 hero size 的 PromptInput 包装器。
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PromptInput } from '@/shared/components/PromptInput';

export function HeroSearchBar() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <PromptInput
      size="hero"
      onSubmit={(content) => navigate(`/projects?idea=${encodeURIComponent(content)}`)}
      onPickModel={() => window.alert(t('portal.heroSearch.modelPickerAlert'))}
      onAttach={() => window.alert(t('portal.heroSearch.attachAlert'))}
    />
  );
}