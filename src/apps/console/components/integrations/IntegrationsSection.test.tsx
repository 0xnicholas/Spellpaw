import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/shared/i18n';
import { IntegrationsSection } from './IntegrationsSection';
import { fetchSettings, updateSettings } from '@console/lib/consoleApi';

vi.mock('@console/lib/consoleApi', () => ({
  fetchSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock('@console/lib/llmSettings', () => ({
  getLLMSettings: () => ({
    provider: 'deepseek',
    apiKey: '',
    apiKeys: {},
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-v4-pro',
  }),
  setLLMSettings: vi.fn(),
  isValidProvider: (v: string) => ['deepseek', 'openai'].includes(v),
  DEFAULT_PROVIDER: 'deepseek',
}));

vi.mock('@drama/lib/imageGen', () => ({
  getSettings: () => ({}),
  setApiKey: vi.fn(),
  setDoubaoApiKey: vi.fn(),
  setMinimaxApiKey: vi.fn(),
}));

vi.mock('@console/lib/syncSettings', () => ({
  syncUserSettings: vi.fn(),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

describe('IntegrationsSection', () => {
  const fetchSettingsMock = vi.mocked(fetchSettings);
  const updateSettingsMock = vi.mocked(updateSettings);

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchSettingsMock.mockResolvedValue({
      openaiApiKey: '',
      doubaoApiKey: '',
      minimaxApiKey: '',
      llmProvider: 'deepseek',
      llmApiKey: '',
      llmApiKeys: {},
      llmBaseUrl: '',
      llmModel: '',
    });
    updateSettingsMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('switches provider input independently', async () => {
    render(<IntegrationsSection />, { wrapper: Wrapper });

    const apiKeyInputs = await screen.findAllByPlaceholderText('sk-...');
    const llmApiKeyInput = apiKeyInputs[0];

    fireEvent.change(llmApiKeyInput, { target: { value: 'sk-deepseek' } });
    expect(llmApiKeyInput).toHaveValue('sk-deepseek');

    const openaiButton = screen.getByRole('button', { name: /OpenAI/i });
    fireEvent.click(openaiButton);

    await waitFor(() => {
      expect(llmApiKeyInput).toHaveValue('');
    });

    fireEvent.change(llmApiKeyInput, { target: { value: 'sk-openai' } });
    expect(llmApiKeyInput).toHaveValue('sk-openai');

    const deepseekButton = screen.getByRole('button', { name: /DeepSeek/i });
    fireEvent.click(deepseekButton);

    await waitFor(() => {
      expect(llmApiKeyInput).toHaveValue('sk-deepseek');
    });
  });

  it('shows success message after saving language model settings', async () => {
    updateSettingsMock.mockResolvedValue({
      success: true,
      data: {
        openaiApiKey: '',
        doubaoApiKey: '',
        minimaxApiKey: '',
        llmProvider: 'deepseek',
        llmApiKey: 'sk-test',
        llmApiKeys: { deepseek: 'sk-test' },
        llmBaseUrl: 'https://api.deepseek.com/v1',
        llmModel: 'deepseek-v4-pro',
      },
    });

    render(<IntegrationsSection />, { wrapper: Wrapper });

    const apiKeyInputs = await screen.findAllByPlaceholderText('sk-...');
    fireEvent.change(apiKeyInputs[0], { target: { value: 'sk-test' } });

    const saveButton = screen.getByRole('button', { name: /保存语言模型设置/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/已保存/i)).toBeInTheDocument();
    });
    expect(updateSettingsMock).toHaveBeenCalledWith(
      expect.objectContaining({ llmApiKeys: expect.objectContaining({ deepseek: 'sk-test' }) })
    );
  });

  it('clears loading state and shows error when save fails', async () => {
    updateSettingsMock.mockRejectedValue(new Error('Network error'));

    render(<IntegrationsSection />, { wrapper: Wrapper });

    const apiKeyInputs = await screen.findAllByPlaceholderText('sk-...');
    fireEvent.change(apiKeyInputs[0], { target: { value: 'sk-test' } });

    const saveButton = screen.getByRole('button', { name: /保存语言模型设置/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/保存失败/i)).toBeInTheDocument();
    });

    expect(saveButton).not.toBeDisabled();
  });
});
