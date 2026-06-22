/**
 * HeroSearchBar — Portal hero 中心的 prompt 输入。
 *
 * 仅一个 hero size 的 PromptInput 包装器。
 */
import { useNavigate } from 'react-router-dom';
import { PromptInput } from '@/shared/components/PromptInput';

export function HeroSearchBar() {
  const navigate = useNavigate();

  return (
    <PromptInput
      size="hero"
      onSubmit={(content) => navigate(`/projects?idea=${encodeURIComponent(content)}`)}
      onPickModel={() => window.alert('模型选择：即将支持 Seedance / Kling / Omni 等')}
      onAttach={() => window.alert('附件上传：即将支持')}
    />
  );
}