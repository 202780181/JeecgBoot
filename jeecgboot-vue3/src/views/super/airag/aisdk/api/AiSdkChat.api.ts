import { defHttp } from '/@/utils/http/axios';

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

export function debugAssistant(params: Recordable) {
  return defHttp.post(
    {
      url: '/airag/app/orchestrator/chat/stream',
      params,
      adapter: 'fetch',
      responseType: 'stream',
      timeout: 60 * 60 * 1000,
    },
    {
      isTransformResponse: false,
      errorMessageMode: 'none',
    }
  );
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
