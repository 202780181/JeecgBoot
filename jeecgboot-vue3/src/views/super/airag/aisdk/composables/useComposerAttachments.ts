import { ref } from 'vue';
import type { ComposerAttachment } from '../types';

export function useComposerAttachments() {
  const attachments = ref<ComposerAttachment[]>([]);

  function clearAttachments() {
    attachments.value.forEach((file) => {
      if (file.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
    });
    attachments.value = [];
  }

  function addAttachments(files: FileList | File[]) {
    const nextFiles = Array.from(files).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));
    attachments.value = [...attachments.value, ...nextFiles];
  }

  function removeAttachment(id: string) {
    const target = attachments.value.find((file) => file.id === id);
    if (target?.previewUrl) {
      URL.revokeObjectURL(target.previewUrl);
    }
    attachments.value = attachments.value.filter((file) => file.id !== id);
  }

  function formatFileSize(size: number) {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return {
    attachments,
    addAttachments,
    clearAttachments,
    formatFileSize,
    removeAttachment,
  };
}
