import type { Ref } from 'vue';
import { nextTick } from 'vue';

export function useAutoScroll(containerRef: Ref<HTMLElement | undefined>) {
  function scrollMessageListToBottom() {
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight;
    }
  }

  async function scrollToBottom() {
    await nextTick();
    scrollMessageListToBottom();
  }

  return {
    scrollToBottom,
  };
}
