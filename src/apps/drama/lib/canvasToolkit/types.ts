export type MediaType = 'image' | 'video';

export type Capability =
  | 'text2image'
  | 'image2image'
  | 'inpaint'
  | 'text2video'
  | 'image2video'
  | 'styleTransfer';

export interface GenerationInput {
  type: MediaType;
  capability: Capability;
  prompt: string;
  referenceUrl?: string;
  batchCount?: number;
  options?: Record<string, unknown>;
}

export interface GenerationTask {
  taskId: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  resultUrl?: string;
  error?: string;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  [key: string]: unknown;
}

export interface GenerationProvider {
  id: string;
  name: string;
  supportedMedia: MediaType[];
  capabilities: Capability[];
  requiredConfigKeys: string[];
  isConfigured(): boolean;
  configure(config: ProviderConfig): void;
  estimateCost(input: GenerationInput): { amount: number; unit: string };
  submit(input: GenerationInput): Promise<GenerationTask>;
  poll?(taskId: string): Promise<GenerationTask>;
}

export type ToolkitResult =
  | { success: true; message: string; cardIds: string[]; taskId?: string }
  | { success: false; message: string; retryable: boolean };
