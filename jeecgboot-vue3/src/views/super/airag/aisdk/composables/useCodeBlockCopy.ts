export function useCodeBlockCopy(options: { onError?: (message: string) => void } = {}) {
  const copyResetTimers = new Map<string, number>();

  async function copyCodeBlock(button: HTMLButtonElement) {
    const wrapper = button.closest('.code-block-wrapper, .stream-code-preview');
    const code = wrapper?.querySelector('code')?.textContent || '';
    if (!code) return;
    try {
      await copyTextToClipboard(code);
      const key = button.dataset.copyKey || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      button.dataset.copyKey = key;
      const previousTimer = copyResetTimers.get(key);
      if (previousTimer) {
        window.clearTimeout(previousTimer);
      }
      button.classList.add('copied');
      button.innerHTML = '<span class="code-block-copy-icon">✓</span><span>已复制</span>';
      const timer = window.setTimeout(() => {
        button.classList.remove('copied');
        button.innerHTML = '<span class="code-block-copy-icon">⧉</span><span>复制</span>';
        copyResetTimers.delete(key);
      }, 1800);
      copyResetTimers.set(key, timer);
    } catch (error: any) {
      options.onError?.(error?.message || '复制失败');
    }
  }

  function handleCodeBlockCopyClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    const button = target?.closest('.code-block-copy');
    if (button instanceof HTMLButtonElement) {
      void copyCodeBlock(button);
    }
  }

  function clearCodeBlockCopyTimers() {
    copyResetTimers.forEach((timer) => window.clearTimeout(timer));
    copyResetTimers.clear();
  }

  return {
    clearCodeBlockCopyTimers,
    handleCodeBlockCopyClick,
  };
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const success = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!success) {
    throw new Error('复制失败');
  }
}
