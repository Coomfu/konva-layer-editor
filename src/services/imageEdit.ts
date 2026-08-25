// 大模型图像编辑服务与任务管理

export type ModelConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  baseUrl: 'https://api-inference.modelscope.cn',
  apiKey: '',
  model: 'Qwen/Qwen-Image-Edit-2511',
};

const STORAGE_KEYS = {
  BASE_URL: 'image_editor_model_base_url',
  API_KEY: 'image_editor_model_api_key',
  MODEL: 'image_editor_model_name',
};

export const getStoredModelConfig = (): ModelConfig => {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_MODEL_CONFIG };
  }

  return {
    baseUrl: localStorage.getItem(STORAGE_KEYS.BASE_URL) || DEFAULT_MODEL_CONFIG.baseUrl,
    apiKey: localStorage.getItem(STORAGE_KEYS.API_KEY) || '',
    model: localStorage.getItem(STORAGE_KEYS.MODEL) || DEFAULT_MODEL_CONFIG.model,
  };
};

export const saveStoredModelConfig = (config: Partial<ModelConfig>): ModelConfig => {
  const current = getStoredModelConfig();
  const next = { ...current, ...config };

  if (typeof window !== 'undefined') {
    if (next.baseUrl) localStorage.setItem(STORAGE_KEYS.BASE_URL, next.baseUrl);
    if (next.apiKey !== undefined) localStorage.setItem(STORAGE_KEYS.API_KEY, next.apiKey);
    if (next.model) localStorage.setItem(STORAGE_KEYS.MODEL, next.model);
  }

  return next;
};

export const normalizeUrl = (url: string) => (url.endsWith('/') ? url.slice(0, -1) : url);

/**
 * 包装请求 URL，如果是外部 http/https 地址则通过本地开发代理中转以解决 CORS 跨域问题
 */
export const wrapProxyUrl = (targetUrl: string): string => {
  if (!targetUrl) return '';
  if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
    return `/api/proxy?target=${encodeURIComponent(targetUrl)}`;
  }
  return targetUrl;
};

/**
 * 包装图片 URL，通过本地图片代理中转以防止外部 OSS 图片造成 Canvas 跨域污染 (tainted canvas)
 */
export const wrapImageProxyUrl = (imageUrl: string): string => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
    return imageUrl;
  }
  return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getErrorMessage = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return `请求失败: ${response.status}`;
  }
  try {
    const data = JSON.parse(text);
    return data?.message || data?.error || data?.Message || text;
  } catch {
    return text;
  }
};

const assertOk = async (response: Response) => {
  if (response.ok) return;
  throw new Error(await getErrorMessage(response));
};

export type CreateImageTaskParams = {
  baseUrl?: string;
  apiKey: string;
  model: string;
  prompt: string;
  imageUrls: string[];
  signal?: AbortSignal;
};

export type TaskStatusResponse = {
  task_id: string;
  task_status: 'PENDING' | 'RUNNING' | 'PROCESSING' | 'SUCCEED' | 'FAILED' | string;
  output_images?: string[];
  message?: string;
};

export async function createImageTask({
  baseUrl = DEFAULT_MODEL_CONFIG.baseUrl,
  apiKey,
  model,
  prompt,
  imageUrls,
  signal,
}: CreateImageTaskParams): Promise<{ task_id: string }> {
  if (!apiKey) {
    throw new Error('请先在设置中配置 API Key / Token');
  }
  if (!model) {
    throw new Error('请指定模型名称 (Model)');
  }
  if (!prompt) {
    throw new Error('请输入提示词 (Prompt)');
  }
  if (!imageUrls || imageUrls.length === 0) {
    throw new Error('请选择需要修改的图层图片');
  }

  const rawEndpoint = `${normalizeUrl(baseUrl)}/v1/images/generations`;
  const requestUrl = wrapProxyUrl(rawEndpoint);

  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json',
      'X-ModelScope-Async-Mode': 'true',
    },
    body: JSON.stringify({
      model: model.trim(),
      prompt: prompt.trim(),
      image_url: imageUrls,
    }),
    signal,
  });

  await assertOk(response);
  const data = await response.json();

  if (!data?.task_id) {
    throw new Error('接口未返回 task_id，请检查模型参数与地址配置');
  }

  return data;
}

export async function getImageTaskStatus({
  baseUrl = DEFAULT_MODEL_CONFIG.baseUrl,
  apiKey,
  taskId,
  signal,
}: {
  baseUrl?: string;
  apiKey: string;
  taskId: string;
  signal?: AbortSignal;
}): Promise<TaskStatusResponse> {
  if (!taskId) {
    throw new Error('缺少 taskId');
  }

  const rawEndpoint = `${normalizeUrl(baseUrl)}/v1/tasks/${taskId}`;
  const requestUrl = wrapProxyUrl(rawEndpoint);

  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      'X-ModelScope-Task-Type': 'image_generation',
    },
    signal,
  });

  await assertOk(response);
  return response.json();
}

export async function pollImageTask({
  baseUrl = DEFAULT_MODEL_CONFIG.baseUrl,
  apiKey,
  taskId,
  interval = 3000,
  timeout = 180000,
  onProgress,
  signal,
}: {
  baseUrl?: string;
  apiKey: string;
  taskId: string;
  interval?: number;
  timeout?: number;
  onProgress?: (status: TaskStatusResponse) => void;
  signal?: AbortSignal;
}): Promise<TaskStatusResponse> {
  const startTime = Date.now();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (signal?.aborted) {
      throw new Error('已取消任务');
    }

    const data = await getImageTaskStatus({
      baseUrl,
      apiKey,
      taskId,
      signal,
    });

    onProgress?.(data);

    if (data?.task_status === 'SUCCEED') {
      return data;
    }

    if (data?.task_status === 'FAILED') {
      throw new Error(data?.message || '大模型图像生成失败');
    }

    if (timeout > 0 && Date.now() - startTime >= timeout) {
      throw new Error('等待大模型生成结果超时，请稍后重试');
    }

    await sleep(interval);
  }
}

export async function executeImageEdit({
  baseUrl,
  apiKey,
  model,
  prompt,
  imageUrls,
  onProgress,
  signal,
}: CreateImageTaskParams & {
  onProgress?: (status: TaskStatusResponse) => void;
}): Promise<{ outputImageUrl: string; taskId: string }> {
  const task = await createImageTask({
    baseUrl,
    apiKey,
    model,
    prompt,
    imageUrls,
    signal,
  });

  const result = await pollImageTask({
    baseUrl,
    apiKey,
    taskId: task.task_id,
    onProgress,
    signal,
  });

  const outputImageUrl = result.output_images?.[0];
  if (!outputImageUrl) {
    throw new Error('模型生成成功，但未返回图片结果');
  }

  return {
    outputImageUrl,
    taskId: task.task_id,
  };
}
