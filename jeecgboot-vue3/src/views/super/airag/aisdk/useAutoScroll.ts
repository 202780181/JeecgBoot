import type { Ref } from 'vue';
import { nextTick } from 'vue';

export function useAutoScroll(containerRef: Ref<HTMLElement | undefined>) {
  let pending = false;

  function scrollMessageListToBottom() {
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight;
    }
  }

  async function scrollToBottom() {
    await nextTick();
    scrollMessageListToBottom();
  }

  function scheduleScrollToBottom() {
    if (pending) return;
    pending = true;
    void nextTick().then(() => {
      window.requestAnimationFrame(() => {
        pending = false;
        scrollMessageListToBottom();
      });
    });
  }

  return {
    scrollToBottom,
    scheduleScrollToBottom,
  };
}
