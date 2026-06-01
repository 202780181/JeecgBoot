import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import mila from 'markdown-it-link-attributes';

interface StreamMarkdownRenderResult {
  html: string;
  inCodeFence: boolean;
}

interface MarkdownSegment {
  committed: string;
  active: string;
  inCodeFence: boolean;
  activeFenceLanguage: string;
}

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  highlight(code, language) {
    const lang = typeof language === 'string' ? language : '';
    const highlighted = lang && hljs.getLanguage(lang) ? hljs.highlight(code, { language: lang }).value : hljs.highlightAuto(code).value;
    return renderCodeBlock(highlighted, lang);
  },
});

markdown.use(mila, { attrs: { target: '_blank', rel: 'noopener noreferrer' } });

export function renderStreamMarkdown(source: string, streaming = false): StreamMarkdownRenderResult {
  if (!streaming) {
    return {
      html: markdown.render(source || ''),
      inCodeFence: false,
    };
  }

  const segment = splitStableMarkdown(source || '');
  const committedHtml = segment.committed ? markdown.render(segment.committed) : '';
  const activeHtml = renderActiveSegment(segment);

  return {
    html: committedHtml + activeHtml,
    inCodeFence: segment.inCodeFence,
  };
}

function splitStableMarkdown(source: string): MarkdownSegment {
  const lines = source.split(/\r?\n/);
  const endsWithLineBreak = /\r?\n$/.test(source);
  const pendingLine = endsWithLineBreak ? '' : lines.pop() || '';
  const stableLines: string[] = [];
  const activeLines: string[] = [];
  let inCodeFence = false;
  let activeFenceLanguage = '';
  let fenceMarker = '';

  for (const line of lines) {
    const fence = getFence(line);
    if (fence) {
      if (!inCodeFence) {
        inCodeFence = true;
        activeFenceLanguage = fence.language;
        fenceMarker = fence.marker;
        activeLines.push(line);
        continue;
      }

      activeLines.push(line);
      if (isClosingFence(fence.marker, fenceMarker)) {
        stableLines.push(...activeLines);
        activeLines.length = 0;
        inCodeFence = false;
        activeFenceLanguage = '';
        fenceMarker = '';
      }
      continue;
    }

    if (inCodeFence) {
      activeLines.push(line);
      continue;
    }

    stableLines.push(line);
  }

  const active = [...activeLines, pendingLine].filter((line, index, list) => line || index < list.length - 1).join('\n');

  return {
    committed: stableLines.length ? `${stableLines.join('\n')}\n` : '',
    active,
    inCodeFence,
    activeFenceLanguage,
  };
}

function renderActiveSegment(segment: MarkdownSegment) {
  if (!segment.active) return '';

  if (segment.inCodeFence) {
    const code = stripOpeningFence(segment.active);
    return [
      '<pre class="stream-code-preview">',
      '<div class="code-block-header"><span class="code-block-header__lang">',
      escapeHtml(segment.activeFenceLanguage || 'text'),
      '</span></div>',
      '<code>',
      escapeHtml(code),
      '</code></pre>',
    ].join('');
  }

  return `<span class="stream-markdown-tail">${escapeHtml(segment.active)}</span>`;
}

function getFence(line: string) {
  const match = line.match(/^(\s*)(`{3,}|~{3,})(.*)$/);
  if (!match) return null;
  return {
    marker: match[2],
    language: match[3]?.trim().split(/\s+/)[0] || '',
  };
}

function isClosingFence(marker: string, openingMarker: string) {
  return marker[0] === openingMarker[0] && marker.length >= openingMarker.length;
}

function stripOpeningFence(value: string) {
  const lines = value.split(/\r?\n/);
  if (getFence(lines[0] || '')) {
    return lines.slice(1).join('\n');
  }
  return value;
}

function renderCodeBlock(str: string, lang?: string) {
  const language = lang || 'text';
  return [
    '<pre class="code-block-wrapper">',
    '<div class="code-block-header"><span class="code-block-header__lang">',
    escapeHtml(language),
    '</span></div>',
    '<code class="hljs code-block-body ',
    escapeHtml(language),
    '">',
    str,
    '</code></pre>',
  ].join('');
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
