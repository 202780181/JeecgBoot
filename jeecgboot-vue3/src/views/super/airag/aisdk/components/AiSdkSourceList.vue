<template>
  <a-popover v-if="items.length" trigger="click" placement="topLeft" overlayClassName="ai-source-popover">
    <template #content>
      <div class="source-panel">
        <div class="source-panel-title">来源</div>
        <div class="source-panel-list">
          <a
            v-for="source in items"
            :key="source.url"
            class="source-panel-item"
            :href="normalizeSourceUrl(source.url)"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="source-panel-site">
              <span class="source-row-icon">
                <span class="source-row-fallback">{{ getSourceInitial(source.url) }}</span>
                <img :src="getSourceFavicon(source.url)" alt="" @error="handleSourceIconError" />
              </span>
              <span>{{ getSourceDomain(source.url) }}</span>
            </span>
            <strong>{{ source.title || getSourceDomain(source.url) }}</strong>
            <em v-if="source.snippet">{{ source.snippet }}</em>
          </a>
        </div>
      </div>
    </template>
    <button class="source-list" type="button">
      <span class="source-icons">
        <span
          v-for="(source, sourceIndex) in items"
          :key="source.url"
          class="source-pill"
          :style="{ zIndex: items.length - sourceIndex }"
          :title="source.title"
        >
          <span class="source-fallback">{{ getSourceInitial(source.url) }}</span>
          <img :src="getSourceFavicon(source.url)" alt="" @error="handleSourceIconError" />
        </span>
      </span>
      <span class="source-list-label">来源</span>
    </button>
  </a-popover>
</template>

<script setup lang="ts">
import type { AiSdkSourceItem } from '../types';

defineProps<{
  items: AiSdkSourceItem[];
}>();

function getSourceFavicon(url: string) {
  try {
    const parsed = new URL(normalizeSourceUrl(url));
    return `https://icons.duckduckgo.com/ip3/${parsed.hostname}.ico`;
  } catch {
    return '';
  }
}

function getSourceInitial(url: string) {
  try {
    const hostname = getSourceDomain(url);
    return hostname.charAt(0).toUpperCase() || 'S';
  } catch {
    return 'S';
  }
}

function getSourceDomain(url: string) {
  try {
    return new URL(normalizeSourceUrl(url)).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function normalizeSourceUrl(url: string) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  try {
    const withProtocol = raw.startsWith('//') ? `https:${raw}` : raw;
    const parsed = new URL(withProtocol, 'https://duckduckgo.com');
    const redirect = parsed.searchParams.get('uddg');
    if (redirect) return decodeURIComponent(redirect);
    return parsed.toString();
  } catch {
    const matchedRedirect = raw.match(/[?&]uddg=([^&]+)/);
    if (matchedRedirect?.[1]) {
      return decodeURIComponent(matchedRedirect[1]);
    }
    return raw;
  }
}

function handleSourceIconError(event: Event) {
  const image = event.target as HTMLImageElement | null;
  if (image) {
    image.style.display = 'none';
  }
}
</script>

<style scoped lang="less">
.source-list {
  display: inline-flex;
  width: fit-content;
  min-height: 24px;
  margin-top: 8px;
  padding: 3px 6px;
  color: #5f6368;
  font-size: 12px;
  line-height: 1;
  background: transparent;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  align-items: center;
  gap: 8px;
  transition: background 0.16s ease;

  &:hover {
    background: #f1f1f1;
  }
}

.source-icons {
  display: inline-flex;
  align-items: center;
}

.source-list-label {
  font-weight: 400;
}

.source-pill {
  display: inline-grid;
  width: 20px;
  height: 20px;
  margin-left: -6px;
  overflow: hidden;
  color: #fff;
  text-decoration: none;
  background: #202124;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgb(0 0 0 / 12%);
  place-items: center;

  &:first-child {
    margin-left: 0;
  }

  img {
    grid-area: 1 / 1;
    z-index: 2;
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.source-fallback {
  grid-area: 1 / 1;
  z-index: 1;
  display: inline-flex;
  width: 100%;
  height: 100%;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  background: #202124;
  align-items: center;
  justify-content: center;
}

:global(.ai-source-popover .ant-popover-inner) {
  padding: 0;
  overflow: hidden;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  box-shadow: 0 10px 28px rgb(15 23 42 / 13%);
}

:global(.ai-source-popover .ant-popover-inner-content) {
  padding: 0;
}

:global(.source-panel) {
  display: flex;
  width: min(340px, calc(100vw - 32px));
  max-height: min(340px, calc(100vh - 120px));
  overflow: hidden;
  color: #111111;
  background: #ffffff;
  flex-direction: column;
}

:global(.source-panel-title) {
  padding: 8px 12px 7px;
  color: #7a7a7a;
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  border-bottom: 1px solid #eeeeee;
}

:global(.source-panel-list) {
  display: flex;
  padding: 2px 12px 5px;
  overflow-x: hidden;
  overflow-y: auto;
  flex-direction: column;
}

:global(.source-panel-item) {
  display: flex;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding: 8px 0 9px;
  box-sizing: border-box;
  color: #111111;
  text-decoration: none;
  border-bottom: 1px solid #eeeeee;
  flex-direction: column;
  gap: 4px;

  &:hover,
  &:focus {
    color: #111111;
    text-decoration: none;
    outline: none;
  }

  &:hover strong,
  &:focus strong {
    color: #111111;
    text-decoration: none;
  }
}

:global(.source-panel-site) {
  display: inline-flex;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  color: #202124;
  font-size: 11px;
  line-height: 1;
  align-items: center;
  gap: 5px;

  > span:last-child {
    overflow: hidden;
    min-width: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

:global(.source-row-icon) {
  display: inline-grid;
  width: 13px;
  height: 13px;
  min-width: 13px;
  max-width: 13px;
  max-height: 13px;
  overflow: hidden;
  color: #fff;
  background: #eeeeee;
  border-radius: 50%;
  flex: 0 0 13px;
  place-items: center;

  img {
    grid-area: 1 / 1;
    z-index: 2;
    display: block;
    width: 100%;
    height: 100%;
    max-width: 13px;
    max-height: 13px;
    object-fit: cover;
  }
}

:global(.source-row-fallback) {
  grid-area: 1 / 1;
  z-index: 1;
  display: inline-flex;
  width: 13px;
  height: 13px;
  color: #555555;
  font-size: 7px;
  font-weight: 700;
  line-height: 1;
  background: #eeeeee;
  align-items: center;
  justify-content: center;
}

:global(.source-panel-item strong) {
  color: #111111;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.32;
  overflow-wrap: anywhere;
  text-decoration: none;
}

:global(.source-panel-item em) {
  display: -webkit-box;
  max-height: 30px;
  overflow: hidden;
  color: #6b7280;
  font-size: 10px;
  font-style: normal;
  line-height: 1.4;
  overflow-wrap: anywhere;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
