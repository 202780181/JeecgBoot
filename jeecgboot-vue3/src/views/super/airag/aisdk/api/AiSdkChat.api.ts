import { defHttp } from '/@/utils/http/axios';
import { useGlobSetting } from '/@/hooks/setting';
import type { AiSdkServerConversation, AiSdkServerMessage } from '../types';

export interface AiModelOption {
  id: string;
  name: string;
  displayName?: string;
  provider?: string;
  modelName?: string;
  modelType?: string;
  activateFlag?: number;
}

export interface AiSkillOption {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

export interface AiSdkUploadedAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string;
  url: string;
}

export async function debugAssistant(params: Recordable, options: { signal?: AbortSignal } = {}) {
  const res = await defHttp.post(
    {
      url: '/airag/app/orchestrator/chat/stream',
      params,
      signal: options.signal,
      adapter: 'fetch',
      responseType: 'stream',
      timeout: 60 * 60 * 1000,
    },
    {
      isTransformResponse: false,
      errorMessageMode: 'none',
    }
  );
  assertSuccessResponse(res);
  return res;
}

export function getOrchestratorSkills() {
  return defHttp.get(
    {
      url: '/airag/app/orchestrator/skills',
    },
    {
      isTransformResponse: false,
      errorMessageMode: 'none',
    }
  );
}

export function getActiveLlmModels() {
  return defHttp.get(
    {
      url: '/airag/airagModel/list',
      params: {
        pageNo: 1,
        pageSize: 100,
        modelType: 'LLM',
        activateFlag: 1,
      },
    },
    {
      isTransformResponse: false,
      errorMessageMode: 'none',
    }
  );
}

export async function uploadAiSdkAttachment(file: File, attachmentId: string): Promise<AiSdkUploadedAttachment> {
  const res: any = await defHttp.uploadFile(
    { url: '/airag/chat/upload' },
    { file, filename: file.name },
    { isReturnResponse: true }
  );
  assertSuccessResponse(res);
  const path = res?.message || res?.result;
  if (!path) {
    throw new Error(`${file.name} 上传失败：未返回文件路径`);
  }
  return {
    id: attachmentId,
    name: file.name,
    size: file.size,
    type: file.type,
    path,
    url: buildStaticFileUrl(path),
  };
}

function buildStaticFileUrl(path: string) {
  const globSetting = useGlobSetting();
  const baseUrl = (globSetting.uploadUrl || globSetting.apiUrl || window._CONFIG?.['domianURL'] || '').replace(/\/$/, '');
  return `${baseUrl}/sys/common/static/${path.replace(/^\/+/, '')}`;
}

function unwrapResult<T>(res: any): T {
  assertSuccessResponse(res);
  const data = res?.result ?? res;
  return (data?.result ?? data) as T;
}

function unwrapList<T>(res: any): T[] {
  assertSuccessResponse(res);
  const data = res?.result ?? res;
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.records)) {
    return data.records;
  }
  if (Array.isArray(data?.result)) {
    return data.result;
  }
  if (Array.isArray(data?.result?.records)) {
    return data.result.records;
  }
  return [];
}

function assertSuccessResponse(res: any) {
  if (res && res.success === false) {
    throw new Error(res.message || '接口调用失败');
  }
}

export async function createAiSdkConversation(params: Recordable) {
  const res = await defHttp.post(
    {
      url: '/airag/app/orchestrator/conversations',
      params,
    },
    {
      isTransformResponse: false,
      errorMessageMode: 'none',
    }
  );
  return unwrapResult<AiSdkServerConversation>(res);
}

export async function listAiSdkConversations(sessionType: string) {
  const res = await defHttp.get(
    {
      url: '/airag/app/orchestrator/conversations',
      params: { sessionType },
    },
    {
      isTransformResponse: false,
      errorMessageMode: 'none',
    }
  );
  return unwrapList<AiSdkServerConversation>(res);
}

export async function listAiSdkMessages(conversationId: string) {
  const res = await defHttp.get(
    {
      url: `/airag/app/orchestrator/conversations/${conversationId}/messages`,
    },
    {
      isTransformResponse: false,
      errorMessageMode: 'none',
    }
  );
  return unwrapList<AiSdkServerMessage>(res);
}

export async function renameAiSdkConversation(conversationId: string, title: string) {
  const res = await defHttp.put(
    {
      url: `/airag/app/orchestrator/conversations/${conversationId}`,
      params: { title },
    },
    {
      isTransformResponse: false,
      errorMessageMode: 'none',
    }
  );
  assertSuccessResponse(res);
  return res;
}

export async function deleteAiSdkConversation(conversationId: string) {
  const res = await defHttp.delete(
    {
      url: `/airag/app/orchestrator/conversations/${conversationId}`,
    },
    {
      isTransformResponse: false,
      errorMessageMode: 'none',
    }
  );
  assertSuccessResponse(res);
  return res;
}
