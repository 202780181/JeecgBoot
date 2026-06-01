<template>
  <div v-if="!virtualEnabled" class="message-text markdown-body" v-html="fallbackHtml"></div>
  <div v-else ref="rootRef" class="message-text markdown-body virtual-markdown">
    <div v-if="tocItems.length" class="virtual-markdown-toc">
      <button
        v-for="item in tocItems"
        :key="item.id"
        type="button"
        :style="{ paddingLeft: `${Math.max(0, item.level - 1) * 12}px` }"
        @click="scrollToBlock(item.blockIndex)"
      >
        {{ item.title }}
      </button>
    </div>
    <div class="virtual-markdown-canvas" :style="{ height: `${totalHeight}px` }">
      <div class="virtual-markdown-window" :style="{ transform: `translateY(${offsetTop}px)` }">
        <div
          v-for="item in visibleItems"
          :key="item.block.id"
          :ref="(el) => setBlockRef(el, item.index)"
          class="virtual-markdown-block"
          :data-block-index="item.index"
          v-html="item.block.html"
        ></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'VirtualMarkdownText',
});
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { renderStreamMarkdown } from './streamMarkdown';
import { createVirtualMarkdownBlocks } from './virtualMarkdown';

const VIRTUAL_BLOCK_THRESHOLD = 80;
const OVERSCAN_BLOCKS = 8;

const props = defineProps<{
  text: string;
  streaming?: boolean;
  scrollContainer?: HTMLElement | null;
}>();

const rootRef = ref<HTMLElement>();
const scrollTop = ref(0);
const viewportHeight = ref(680);
const measuredHeights = ref<Record<number, number>>({});
const blockElements = new Map<number, Element>();
let resizeObserver: ResizeObserver | null = null;

const parsed = computed(() => createVirtualMarkdownBlocks(props.text || '', !!props.streaming));
const blocks = computed(() => parsed.value.blocks);
const tocItems = computed(() => parsed.value.tocItems);
const virtualEnabled = computed(() => blocks.value.length >= VIRTUAL_BLOCK_THRESHOLD);
const fallbackHtml = computed(() => renderStreamMarkdown(props.text || '', !!props.streaming).html);
const heights = computed(() => blocks.value.map((block, index) => measuredHeights.value[index] || block.estimatedHeight));
const positions = computed(() => {
  let top = 0;
  return heights.value.map((height) => {
    const position = top;
    top += height;
    return position;
  });
});
const totalHeight = computed(() => heights.value.reduce((total, height) => total + height, 0));
const visibleRange = computed(() => {
  if (!virtualEnabled.value) {
    return { start: 0, end: blocks.value.length };
  }
  const rootOffset = rootRef.value?.offsetTop || 0;
  const localScrollTop = Math.max(0, scrollTop.value - rootOffset);
  const start = Math.max(0, findBlockIndex(localScrollTop) - OVERSCAN_BLOCKS);
  const end = Math.min(blocks.value.length, findBlockIndex(localScrollTop + viewportHeight.value) + OVERSCAN_BLOCKS + 1);
  return { start, end };
});
const visibleItems = computed(() =>
  blocks.value.slice(visibleRange.value.start, visibleRange.value.end).map((block, offset) => ({
    block,
    index: visibleRange.value.start + offset,
  }))
);
const offsetTop = computed(() => positions.value[visibleRange.value.start] || 0);

watch(
  () => [props.text, props.streaming],
  () => {
    measuredHeights.value = {};
    nextTick(measureVisibleBlocks);
  }
);

watch(visibleItems, () => nextTick(measureVisibleBlocks));

onMounted(() => {
  resizeObserver = new ResizeObserver((entries) => {
    const nextHeights = { ...measuredHeights.value };
    let changed = false;
    entries.forEach((entry) => {
      const index = Number((entry.target as HTMLElement).dataset.blockIndex);
      const height = Math.ceil(entry.contentRect.height);
      if (Number.isFinite(index) && height > 0 && nextHeights[index] !== height) {
        nextHeights[index] = height;
        changed = true;
      }
    });
    if (changed) {
      measuredHeights.value = nextHeights;
    }
  });
  getScrollContainer()?.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleResize);
  handleResize();
  handleScroll();
  nextTick(measureVisibleBlocks);
});

onBeforeUnmount(() => {
  getScrollContainer()?.removeEventListener('scroll', handleScroll);
  window.removeEventListener('resize', handleResize);
  resizeObserver?.disconnect();
});

function getScrollContainer() {
  return props.scrollContainer || null;
}

function handleScroll() {
  const container = getScrollContainer();
  scrollTop.value = container?.scrollTop || 0;
}

function handleResize() {
  viewportHeight.value = getScrollContainer()?.clientHeight || 680;
}

function setBlockRef(el: Element | null, index: number) {
  const previous = blockElements.get(index);
  if (previous && previous !== el) {
    resizeObserver?.unobserve(previous);
    blockElements.delete(index);
  }
  if (!el) return;
  blockElements.set(index, el);
  resizeObserver?.observe(el);
}

function measureVisibleBlocks() {
  const nextHeights = { ...measuredHeights.value };
  let changed = false;
  blockElements.forEach((element, index) => {
    const height = Math.ceil((element as HTMLElement).offsetHeight);
    if (height > 0 && nextHeights[index] !== height) {
      nextHeights[index] = height;
      changed = true;
    }
  });
  if (changed) {
    measuredHeights.value = nextHeights;
  }
}

function findBlockIndex(targetTop: number) {
  const tops = positions.value;
  let left = 0;
  let right = tops.length - 1;
  let answer = 0;
  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    if (tops[middle] <= targetTop) {
      answer = middle;
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }
  return answer;
}

function scrollToBlock(index: number) {
  const container = getScrollContainer();
  if (!container) return;
  const rootOffset = rootRef.value?.offsetTop || 0;
  container.scrollTo({
    top: rootOffset + (positions.value[index] || 0),
    behavior: 'smooth',
  });
}
</script>

<style scoped lang="less">
.virtual-markdown {
  position: relative;
  width: 100%;
}

.virtual-markdown-toc {
  display: grid;
  max-height: 220px;
  margin: 0 0 12px;
  padding: 8px;
  overflow: auto;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  gap: 2px;

  button {
    display: block;
    width: 100%;
    min-height: 28px;
    padding: 4px 8px;
    overflow: hidden;
    color: #4b5563;
    font-size: 12px;
    line-height: 20px;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
    background: transparent;
    border: 0;
    border-radius: 5px;
    cursor: pointer;

    &:hover {
      color: var(--ai-primary);
      background: #ffffff;
    }
  }
}

.virtual-markdown-canvas {
  position: relative;
  min-height: 1px;
}

.virtual-markdown-window {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  will-change: transform;
}

.virtual-markdown-block {
  padding: 1px 0;
}
</style>
