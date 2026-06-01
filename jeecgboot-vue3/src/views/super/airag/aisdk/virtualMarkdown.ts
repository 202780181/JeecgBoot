import { renderStreamMarkdown } from './streamMarkdown';

export interface VirtualMarkdownBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'code' | 'quote' | 'table' | 'rule';
  level?: number;
  raw: string;
  html: string;
  estimatedHeight: number;
}

export interface VirtualTocItem {
  id: string;
  title: string;
  level: number;
  blockIndex: number;
}

const DEFAULT_BLOCK_HEIGHT = 92;

export function createVirtualMarkdownBlocks(source: string, streaming = false) {
  const blocks = splitMarkdownBlocks(source || '', streaming).map((raw, index) => createBlock(raw, index, streaming));
  const tocItems = blocks
    .map((block, index) => {
      if (block.type !== 'heading') return null;
      return {
        id: block.id,
        title: getHeadingTitle(block.raw),
        level: block.level || 1,
        blockIndex: index,
      } satisfies VirtualTocItem;
    })
    .filter(Boolean) as VirtualTocItem[];

  return {
    blocks,
    tocItems,
  };
}

function splitMarkdownBlocks(source: string, streaming: boolean) {
  const lines = source.split(/\r?\n/);
  const blocks: string[] = [];
  let current: string[] = [];
  let inCodeFence = false;
  let fenceMarker = '';

  function pushCurrent() {
    if (!current.length) return;
    const raw = current.join('\n').trimEnd();
    if (raw.trim()) {
      blocks.push(raw);
    }
    current = [];
  }

  for (const line of lines) {
    const fence = getFence(line);
    if (fence) {
      if (!inCodeFence) {
        pushCurrent();
        inCodeFence = true;
        fenceMarker = fence.marker;
        current.push(line);
        continue;
      }

      current.push(line);
      if (isClosingFence(fence.marker, fenceMarker)) {
        inCodeFence = false;
        fenceMarker = '';
        pushCurrent();
      }
      continue;
    }

    if (inCodeFence) {
      current.push(line);
      continue;
    }

    if (!line.trim()) {
      pushCurrent();
      continue;
    }

    if (isHeading(line) || isRule(line) || startsNewBlock(line, current)) {
      pushCurrent();
    }

    current.push(line);
  }

  pushCurrent();

  if (streaming && blocks.length) {
    return blocks;
  }
  return blocks;
}

function createBlock(raw: string, index: number, streaming: boolean): VirtualMarkdownBlock {
  const type = getBlockType(raw);
  return {
    id: `md-block-${index}-${hashText(raw)}`,
    type,
    level: type === 'heading' ? getHeadingLevel(raw) : undefined,
    raw,
    html: renderStreamMarkdown(raw, streaming).html,
    estimatedHeight: estimateBlockHeight(raw, type),
  };
}

function startsNewBlock(line: string, current: string[]) {
  if (!current.length) return false;
  return isHeading(line) || isList(line) || isQuote(line) || isTable(line);
}

function getBlockType(raw: string): VirtualMarkdownBlock['type'] {
  const firstLine = raw.trimStart().split(/\r?\n/)[0] || '';
  if (isHeading(firstLine)) return 'heading';
  if (getFence(firstLine)) return 'code';
  if (isList(firstLine)) return 'list';
  if (isQuote(firstLine)) return 'quote';
  if (isTable(firstLine)) return 'table';
  if (isRule(firstLine)) return 'rule';
  return 'paragraph';
}

function estimateBlockHeight(raw: string, type: VirtualMarkdownBlock['type']) {
  const lines = Math.max(1, raw.split(/\r?\n/).length);
  const chars = raw.length;
  if (type === 'code') return Math.max(96, lines * 23 + 44);
  if (type === 'heading') return 48;
  if (type === 'list') return Math.max(44, lines * 28);
  if (type === 'table') return Math.max(88, lines * 34);
  if (type === 'quote') return Math.max(48, lines * 26);
  return Math.max(34, Math.ceil(chars / 80) * 25);
}

function getFence(line: string) {
  const match = line.match(/^(\s*)(`{3,}|~{3,})(.*)$/);
  if (!match) return null;
  return {
    marker: match[2],
  };
}

function isClosingFence(marker: string, openingMarker: string) {
  return marker[0] === openingMarker[0] && marker.length >= openingMarker.length;
}

function isHeading(line: string) {
  return /^#{1,6}\s+\S/.test(line.trimStart());
}

function getHeadingLevel(raw: string) {
  return raw.trimStart().match(/^(#{1,6})\s+/)?.[1].length || 1;
}

function getHeadingTitle(raw: string) {
  return raw
    .trimStart()
    .replace(/^#{1,6}\s+/, '')
    .replace(/\s+#*$/, '')
    .trim();
}

function isList(line: string) {
  return /^(\s*)([-*+]|\d+[.)])\s+\S/.test(line);
}

function isQuote(line: string) {
  return /^\s*>\s?/.test(line);
}

function isTable(line: string) {
  return /^\s*\|.+\|\s*$/.test(line);
}

function isRule(line: string) {
  return /^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line);
}

function hashText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export { DEFAULT_BLOCK_HEIGHT };
