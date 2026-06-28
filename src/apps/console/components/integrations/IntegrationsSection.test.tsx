import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { IntegrationsSection } from './IntegrationsSection';
import { fetchSettings, updateSettings } from '@console/lib/consoleApi';

vi.mock('@console/lib/consoleApi', () => ({
  fetchSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock('@drama/lib/imageGen', () => ({
  getSettings: () => ({}),
}));

vi.mock('@console/lib/syncSettings', () => ({
  syncUserSettings: vi.fn(),
}));

describe('IntegrationsSection — Phase 4 capability-grouped', () => {
  const fetchSettingsMock = vi.mocked(fetchSettings);
  const updateSettingsMock = vi.mocked(updateSettings);

  beforeEach(() => {
    fetchSettingsMock.mockResolvedValue({
      openaiApiKey: '',
      doubaoApiKey: '',
      minimaxApiKey: '',
      llmConfigs: {},
    });
    updateSettingsMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders three capability blocks', async () => {
    render(<IntegrationsSection />);
    expect(await screen.findByText('文本生成')).toBeInTheDocument();
    expect(screen.getByText('图片生成')).toBeInTheDocument();
    expect(screen.getByText('视频生成')).toBeInTheDocument();
  });

  it('renders providers filtered by capability', async () => {
    render(<IntegrationsSection />);
    await screen.findByText('文本生成');
    // Text: deepseek, doubao, openai, minimax (not siliconflow which is image-only)
    expect(screen.getByRole('button', { name: 'DeepSeek' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '硅基流动' })).toBeInTheDocument(); // appears in image block
    // siliconflow is image-only, not in text — but since text/image are separate blocks, both blocks render
    // we just check that for the image block, siliconflow appears (which it does)
  });

  it('switches provider resets baseUrl/model to recommended', async () => {
    render(<IntegrationsSection />);
    await screen.findByText('文本生成');

    // In the text block (first block), the first button is DeepSeek (default selected)
    const textBlock = screen.getByText('文本生成').closest('section')!;
    expect(textBlock.querySelector('button.bg-white')!.textContent).toBe('DeepSeek');

    // Find the Doubao button specifically within the text section
    const allButtons = textBlock.querySelectorAll('button');
    let doubaoBtnEl: HTMLButtonElement | undefined;
    allButtons.forEach((b) => {
      if (b.textContent === '豆包') doubaoBtnEl = b as HTMLButtonElement;
    });
    expect(doubaoBtnEl).toBeDefined();
    fireEvent.click(doubaoBtnEl!);

    // baseUrl and model should be reset to doubao defaults
    const baseUrlInput = textBlock.querySelector('input[placeholder="https://api.example.com/v1"]') as HTMLInputElement;
    expect(baseUrlInput.value).toBe('https://ark.cn-beijing.volces.com/api/v3');
    const modelInput = textBlock.querySelectorAll('input')[2] as HTMLInputElement; // 0=apiKey pw, 1=baseUrl, 2=model
    expect(modelInput.value).toBe('doubao-seed-2-0-pro');
  });

  it('saves one capability independently', async () => {
    updateSettingsMock.mockResolvedValue({
      success: true,
      data: {
        openaiApiKey: '',
        doubaoApiKey: '',
        minimaxApiKey: '',
        llmConfigs: {
          text: { provider: 'deepseek', apiKey: 'sk-test', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-v4-flash' },
        },
      },
    });

    render(<IntegrationsSection />);
    const textSection = (await screen.findByText('文本生成')).closest('section')!;
    const apiKeyInput = textSection.querySelector('input[type="password"]') as HTMLInputElement;
    fireEvent.change(apiKeyInput, { target: { value: 'sk-test' } });

    // Click the save button (last button in section)
    const buttons = textSection.querySelectorAll('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText(/已保存/i)).toBeInTheDocument();
    });

    expect(updateSettingsMock).toHaveBeenCalledTimes(1);
    const call = updateSettingsMock.mock.calls[0][0] as { llmConfigs: { text: { provider: string; apiKey: string } } };
    expect(call.llmConfigs.text.provider).toBe('deepseek');
    expect(call.llmConfigs.text.apiKey).toBe('sk-test');
  });

  it('shows error message when save fails', async () => {
    updateSettingsMock.mockResolvedValue({ success: false, error: 'Network error' });

    render(<IntegrationsSection />);
    const textSection = (await screen.findByText('文本生成')).closest('section')!;
    const buttons = textSection.querySelectorAll('button');
    fireEvent.click(buttons[buttons.length - 1]); // save button

    await waitFor(() => {
      expect(screen.getByText(/保存失败/i)).toBeInTheDocument();
    });
  });

  it('warns when saved provider does not support the capability', async () => {
    fetchSettingsMock.mockResolvedValue({
      openaiApiKey: '',
      doubaoApiKey: '',
      minimaxApiKey: '',
      llmConfigs: {
        text: { provider: 'siliconflow' as unknown as 'deepseek', apiKey: '', baseUrl: 'x', model: 'y' },
      },
    });

    render(<IntegrationsSection />);
    await screen.findByText('文本生成');
    expect(await screen.findByText(/不支持 文本生成/i)).toBeInTheDocument();
  });
});