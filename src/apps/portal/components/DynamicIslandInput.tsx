/**
 * DynamicIslandInput — Portal 视口底部的浮动 prompt 输入。
 *
 * 复用 PromptInput size="floating"。PortalPage 通过观察 Hero 区域
 * 的可见性控制本组件 hidden / visible —— hero 在视口内时不显示。
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PromptInput } from '@/shared/components/PromptInput';

interface DynamicIslandInputProps {
  /** 由 PortalPage 控制：true = 显示在视口底部；false = 完全不渲染 */
  visible: boolean;
}

export function DynamicIslandInput({ visible }: DynamicIslandInputProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <PromptInput
      size="floating"
      onSubmit={(content) => navigate(`/projects?idea=${encodeURIComponent(content)}`)}
      onPickModel={() => window.alert(t('portal.dynamicIsland.modelPickerAlert'))}
      onAttach={() => window.alert(t('portal.dynamicIsland.attachAlert'))}
    />
  );
}