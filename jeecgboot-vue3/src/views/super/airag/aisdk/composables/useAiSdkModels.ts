import { computed, ref } from 'vue';
import type { AiModelOption } from '../api/AiSdkChat.api';
import { getActiveLlmModels } from '../api/AiSdkChat.api';

interface UseAiSdkModelsOptions {
  onError?: (message: string) => void;
}

export function useAiSdkModels(options: UseAiSdkModelsOptions = {}) {
  const modelOptions = ref<AiModelOption[]>([]);
  const selectedModelId = ref('');
  const modelLoading = ref(false);

  const selectedModelLabel = computed(() => {
    if (modelLoading.value) return '加载模型';
    const selectedModel = modelOptions.value.find((model) => model.id === selectedModelId.value);
    return selectedModel?.displayName || selectedModel?.name || selectedModel?.modelName || '默认模型';
  });

  async function loadActiveLlmModels() {
    modelLoading.value = true;
    try {
      const res = await getActiveLlmModels();
      const records = res?.result?.records || res?.records || [];
      modelOptions.value = Array.isArray(records)
        ? records.map((model) => ({
            id: model.id,
            name: model.name || model.modelName || '未命名模型',
            displayName: model.modelName || model.name || '未命名模型',
            provider: model.provider,
            modelName: model.modelName,
            modelType: model.modelType,
            activateFlag: model.activateFlag,
          }))
        : [];
      if (!selectedModelId.value && modelOptions.value.length) {
        selectedModelId.value = modelOptions.value[0].id;
      }
    } catch (error: any) {
      modelOptions.value = [];
      options.onError?.(error?.message || 'AI 模型配置读取失败');
    } finally {
      modelLoading.value = false;
    }
  }

  function selectModel(id: string) {
    selectedModelId.value = id;
  }

  return {
    loadActiveLlmModels,
    modelLoading,
    modelOptions,
    selectModel,
    selectedModelId,
    selectedModelLabel,
  };
}
