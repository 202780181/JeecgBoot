import type { Ref } from 'vue';
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

export function useAutoScroll(containerRef: Ref<HTMLElement | undefined>) {
  const bottomThreshold = 48;
  const isPinnedToBottom = ref(true);
  let scrollFrame = 0;

  function isNearBottom(container: HTMLElement) {
    return container.scrollHeight - container.scrollTop - container.clientHeight <= bottomThreshold;
  }

  function updatePinnedState() {
    if (!containerRef.value) {
      isPinnedToBottom.value = true;
      return;
    }
    isPinnedToBottom.value = isNearBottom(containerRef.value);
  }

  function scrollMessageListToBottom() {
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight;
      isPinnedToBottom.value = true;
    }
  }

  async function scrollToBottom() {
    await nextTick();
    scrollMessageListToBottom();
  }

  async function scrollToBottomIfPinned() {
    if (!isPinnedToBottom.value) return;
    await nextTick();
    if (!isPinnedToBottom.value) return;
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(scrollMessageListToBottom);
  }

  function handleScroll() {
    updatePinnedState();
  }

  watch(
    containerRef,
    (nextContainer, previousContainer) => {
      previousContainer?.removeEventListener('scroll', handleScroll);
      nextContainer?.addEventListener('scroll', handleScroll, { passive: true });
      updatePinnedState();
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    cancelAnimationFrame(scrollFrame);
    containerRef.value?.removeEventListener('scroll', handleScroll);
  });

  return {
    isPinnedToBottom,
    scrollToBottom,
    scrollToBottomIfPinned,
  };
}
