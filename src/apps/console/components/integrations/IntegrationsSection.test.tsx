import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
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

  it('renders one card per capability', async () => {
    render(<IntegrationsSection />);
    expect(await screen.findByText('文生图 (text2image)')).toBeInTheDocument();
    expect(screen.getByText('图生图 (image2image)')).toBeInTheDocument();
    expect(screen.getByText('局部重绘 (inpaint)')).toBeInTheDocument();
    expect(screen.getByText('文生视频 (text2video)')).toBeInTheDocument();
    expect(screen.getByText('图生视频 (image2video)')).toBeInTheDocument();
    expect(screen.getByText('风格迁移 (styleTransfer)')).toBeInTheDocument();
    expect(screen.getByText('文生音频 (text2audio)')).toBeInTheDocument();
    expect(screen.getByText('文生模型 (text2model)')).toBeInTheDocument();
    expect(screen.getByText('图生模型 (image2model)')).toBeInTheDocument();
  });

  it('filters providers per capability', async () => {
    render(<IntegrationsSection />);
    await screen.findByText('文生图 (text2image)');
    // text2image: deepseek, doubao, openai, minimax (not siliconflow)
    const t2iBlock = screen.getByText('文生图 (text2image)').closest('section')!;
    expect(t2iBlock.querySelector('button.bg-white')?.textContent).toBeTruthy();
    // styleTransfer: doubao, openai, siliconflow (not deepseek/minimax)
    const stBlock = screen.getByText('风格迁移 (styleTransfer)').closest('section')!;
    expect(stBlock.textContent).toContain('硅基流动');
    expect(stBlock.textContent).not.toContain('DeepSeek');
  });

  it('switches provider resets baseUrl/model to recommended', async () => {
    fetchSettingsMock.mockResolvedValue({
      llmConfigs: {
        text2image: { provider: 'openai', apiKey: 'sk-openai', baseUrl: 'https://api.openai.com/v1', model: 'gpt-image-2' },
      },
    });

    render(<IntegrationsSection />);
    await screen.findByText('文生图 (text2image)');
    const t2iBlock = screen.getByText('文生图 (text2image)').closest('section')!;

    // OpenAI is the default selected; switch to Doubao
    const allButtons = t2iBlock.querySelectorAll('button');
    let doubaoBtnEl: HTMLButtonElement | undefined;
    allButtons.forEach((b) => {
      if (b.textContent === '豆包') doubaoBtnEl = b as HTMLButtonElement;
    });
    expect(doubaoBtnEl).toBeDefined();
    fireEvent.click(doubaoBtnEl!);

    const baseUrlInput = t2iBlock.querySelector('input[placeholder="https://api.example.com/v1"]') as HTMLInputElement;
    expect(baseUrlInput.value).toBe('https://ark.cn-beijing.volces.com/api/v3');
    // text2image maps to "image" media; doubao's recommended image model
    const modelInput = t2iBlock.querySelectorAll('input')[2] as HTMLInputElement;
    expect(modelInput.value).toBe('doubao-seedream-5-0-lite');
  });

  it('saves one capability independently', async () => {
    updateSettingsMock.mockResolvedValue({
      success: true,
      data: {
        llmConfigs: {
          text2image: { provider: 'doubao', apiKey: 'sk-test', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-seedream-5-0-lite' },
        },
      },
    });

    render(<IntegrationsSection />);
    const t2iBlock = (await screen.findByText('文生图 (text2image)')).closest('section')!;
    const apiKeyInput = t2iBlock.querySelector('input[type="password"]') as HTMLInputElement;
    fireEvent.change(apiKeyInput, { target: { value: 'sk-test' } });

    const buttons = t2iBlock.querySelectorAll('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText(/已保存/i)).toBeInTheDocument();
    });

    expect(updateSettingsMock).toHaveBeenCalledTimes(1);
    const call = updateSettingsMock.mock.calls[0][0] as {
      llmConfigs: { text2image: { provider: string; apiKey: string } };
    };
    expect(call.llmConfigs.text2image.provider).toBe('doubao');
    expect(call.llmConfigs.text2image.apiKey).toBe('sk-test');
  });

  it('shows error message when save fails', async () => {
    updateSettingsMock.mockResolvedValue({ success: false, error: 'Network error' });

    render(<IntegrationsSection />);
    const t2iBlock = (await screen.findByText('文生图 (text2image)')).closest('section')!;
    const buttons = t2iBlock.querySelectorAll('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText(/保存失败/i)).toBeInTheDocument();
    });
  });

  it('warns when saved provider does not support the capability', async () => {
    // The Integrations UI only ever sends a provider string that the registry
    // knows about, so to force the "not supported" warning path we monkey-
    // patch a ProviderConfig onto the registry for this test.
    fetchSettingsMock.mockResolvedValue({
      llmConfigs: {
        // deepseek is text-only; try to use it for the image-styleTransfer
        // capability so the providerSupports check fails.
        styleTransfer: { provider: 'deepseek', apiKey: 'sk-d', baseUrl: 'u', model: 'm' },
      },
    });

    render(<IntegrationsSection />);
    const stBlock = (await screen.findByText('风格迁移 (styleTransfer)')).closest('section')!;
    expect(within(stBlock).getByText(/不支持/)).toBeInTheDocument();
  });

  it('text2audio card defaults to OpenAI', async () => {
    render(<IntegrationsSection />);
    await screen.findByText('文生音频 (text2audio)');
    const audioBlock = screen.getByText('文生音频 (text2audio)').closest('section')!;
    const selected = audioBlock.querySelector('button.bg-white')?.textContent;
    expect(selected).toBe('OpenAI');
  });

  it('text2model and image2model have no providers (empty pill row)', async () => {
    render(<IntegrationsSection />);
    await screen.findByText('文生模型 (text2model)');
    const block = screen.getByText('文生模型 (text2model)').closest('section')!;
    // No provider buttons rendered when no provider supports the capability
    const pills = block.querySelectorAll('button.bg-white, button:not([type="button"][class*="bg-"])');
    const providerPills = Array.from(pills).filter((b) =>
      ['豆包', 'OpenAI', 'DeepSeek', 'Minimax', '硅基流动'].includes(b.textContent ?? ''),
    );
    expect(providerPills.length).toBe(0);
  });

  it('routes different capabilities to different provider configs', async () => {
    fetchSettingsMock.mockResolvedValue({
      llmConfigs: {
        text2image: { provider: 'doubao', apiKey: 'ark-t2i', baseUrl: 'u', model: 'doubao-seedream-5-0-lite' },
        image2image: { provider: 'siliconflow', apiKey: 'sf-i2i', baseUrl: 'u-sf', model: 'FLUX.2-dev' },
        text2video: { provider: 'doubao', apiKey: 'ark-t2v', baseUrl: 'u', model: 'doubao-seedance-2-5' },
      },
    });

    render(<IntegrationsSection />);
    await screen.findByText('文生图 (text2image)');

    // Verify each section has the right config rendered
    const t2iBlock = screen.getByText('文生图 (text2image)').closest('section')!;
    expect((t2iBlock.querySelector('input[type="password"]') as HTMLInputElement).value).toBe('ark-t2i');

    const i2iBlock = screen.getByText('图生图 (image2image)').closest('section')!;
    expect((i2iBlock.querySelector('input[type="password"]') as HTMLInputElement).value).toBe('sf-i2i');

    const t2vBlock = screen.getByText('文生视频 (text2video)').closest('section')!;
    expect((t2vBlock.querySelector('input[type="password"]') as HTMLInputElement).value).toBe('ark-t2v');
  });
});