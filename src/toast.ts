// ============================================
// مصاريفي - نظام التنبيهات (Phase 9: Enhanced UX)
// ============================================
import { t } from './i18n/engine';
import { registerToBridge } from './core/AppBridge';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface PromptSheetOptions {
  isTextarea?: boolean;
  isPassword?: boolean;
  placeholder?: string;
  showPaste?: boolean;
}

export function toast(msg: unknown, type: ToastType = 'success'): void {
  const el = document.createElement('div');
  const bg =
    type === 'success'
      ? '#1b6d24'
      : type === 'error'
      ? '#5e0006'
      : type === 'warning'
      ? '#92400e'
      : '#1a4175';
  const icon =
    type === 'success'
      ? 'check_circle'
      : type === 'error'
      ? 'error'
      : type === 'warning'
      ? 'warning'
      : 'info';

  el.className = 'masarifi-toast';
  el.style.background = bg;
  const iconEl = document.createElement('span');
  iconEl.className = 'material-symbols-outlined';
  iconEl.style.fontSize = '18px';
  iconEl.textContent = icon;
  const msgEl = document.createElement('span');
  msgEl.textContent = String(msg ?? '');
  el.append(iconEl, msgEl);
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.classList.add('masarifi-toast--visible');
  });
  setTimeout(() => {
    el.classList.remove('masarifi-toast--visible');
    setTimeout(() => el.remove(), 350);
  }, 2500);
}

export function confirmSheet(
  msg: string,
  onConfirm: () => void,
  confirmLabel?: string,
  cancelLabel?: string
): void {
  const overlay = document.createElement('div');
  overlay.className = 'bottom-sheet-overlay';
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:9998;display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity 0.3s ease;';

  const cLabel = confirmLabel || t('action.confirm') || 'تأكيد';
  const xLabel = cancelLabel || t('action.cancel') || 'إلغاء';

  const content = document.createElement('div');
  content.className = 'bottom-sheet-content animate-slideUp';
  content.style.cssText =
    'background:var(--color-surface);width:100%;max-width:500px;border-radius:24px 24px 0 0;padding:24px;padding-bottom:calc(24px + env(safe-area-inset-bottom));font-family:inherit;box-shadow:0 -10px 40px rgba(0,0,0,0.1)';

  const handle = document.createElement('div');
  handle.style.cssText =
    'width:40px;height:4px;border-radius:4px;background:var(--color-outline-variant);margin:0 auto 16px;opacity:0.5';
  content.appendChild(handle);

  const text = document.createElement('p');
  text.style.cssText =
    'font-weight:700;font-size:16px;margin-bottom:8px;text-align:center;color:var(--color-on-surface)';
  text.textContent = msg;
  content.appendChild(text);

  const btnContainer = document.createElement('div');
  btnContainer.style.cssText = 'display:flex;gap:12px;margin-top:20px';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'haptic-btn';
  cancelBtn.style.cssText =
    'flex:1;padding:14px;border-radius:16px;background:var(--color-surface-container-high);font-weight:700;border:none;font-size:14px;cursor:pointer;color:var(--color-on-surface);transition:all 0.15s';
  cancelBtn.textContent = xLabel;

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'haptic-btn';
  confirmBtn.style.cssText =
    'flex:1;padding:14px;border-radius:16px;background:var(--color-tertiary);color:var(--color-on-tertiary);font-weight:700;border:none;font-size:14px;cursor:pointer;transition:all 0.15s';
  confirmBtn.textContent = cLabel;

  btnContainer.appendChild(cancelBtn);
  btnContainer.appendChild(confirmBtn);
  content.appendChild(btnContainer);
  overlay.appendChild(content);

  document.body.appendChild(overlay);
  requestAnimationFrame(() => (overlay.style.opacity = '1'));

  if (navigator.vibrate) navigator.vibrate(12);

  const close = (): void => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
  };

  cancelBtn.onclick = close;
  confirmBtn.onclick = (): void => {
    if (navigator.vibrate) navigator.vibrate(15);
    close();
    onConfirm();
  };
  overlay.onclick = (e: MouseEvent): void => {
    if (e.target === overlay) close();
  };
}

export function choiceSheet(
  msg: string,
  onActionA: () => void,
  onActionB: () => void,
  labelA = 'Save',
  labelB = 'Share'
): void {
  const overlay = document.createElement('div');
  overlay.className = 'bottom-sheet-overlay';
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:9998;display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity 0.3s ease;';

  const cA = labelA === 'Save' ? t('action.saveToDevice') : labelA;
  const cB = labelB === 'Share' ? t('action.share') : labelB;

  const content = document.createElement('div');
  content.className = 'bottom-sheet-content animate-slideUp';
  content.style.cssText =
    'background:var(--color-surface);width:100%;max-width:500px;border-radius:32px 32px 0 0;padding:24px;padding-bottom:calc(24px + env(safe-area-inset-bottom));font-family:inherit;box-shadow: 0 -10px 40px rgba(0,0,0,0.2)';

  const handle = document.createElement('div');
  handle.style.cssText =
    'width:40px;height:4px;border-radius:4px;background:var(--color-outline-variant);margin:0 auto 20px;opacity:0.5';
  content.appendChild(handle);

  const text = document.createElement('p');
  text.style.cssText =
    'font-weight:700;font-size:16px;margin-bottom:24px;text-align:center;color:var(--color-on-surface)';
  text.textContent = msg;
  content.appendChild(text);

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px';

  const btnA = document.createElement('button');
  btnA.className = 'active:scale-95';
  btnA.style.cssText =
    'display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px;border-radius:24px;background:var(--color-primary-container);color:var(--color-on-primary-container);border:none;cursor:pointer;transition:all 0.2s;font-weight:700';

  const iconA = document.createElement('span');
  iconA.className = 'material-symbols-outlined';
  iconA.style.cssText = 'font-size:32px';
  iconA.textContent = 'save';

  const spanA = document.createElement('span');
  spanA.style.cssText = 'font-size:12px;text-transform:uppercase';
  spanA.textContent = cA;

  btnA.appendChild(iconA);
  btnA.appendChild(spanA);

  const btnB = document.createElement('button');
  btnB.className = 'active:scale-95';
  btnB.style.cssText =
    'display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px;border-radius:24px;background:var(--color-surface-container-high);color:var(--color-on-surface);border:none;cursor:pointer;transition:all 0.2s;font-weight:700';

  const iconB = document.createElement('span');
  iconB.className = 'material-symbols-outlined';
  iconB.style.cssText = 'font-size:32px';
  iconB.textContent = 'share';

  const spanB = document.createElement('span');
  spanB.style.cssText = 'font-size:12px;text-transform:uppercase';
  spanB.textContent = cB;

  btnB.appendChild(iconB);
  btnB.appendChild(spanB);

  grid.appendChild(btnA);
  grid.appendChild(btnB);
  content.appendChild(grid);

  const cancelBtn = document.createElement('button');
  cancelBtn.style.cssText =
    'width:100%;margin-top:16px;padding:16px;background:transparent;border:none;color:var(--color-outline);font-weight:700;cursor:pointer';
  cancelBtn.textContent = t('action.cancel');
  content.appendChild(cancelBtn);

  overlay.appendChild(content);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => (overlay.style.opacity = '1'));

  const close = (): void => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
  };
  cancelBtn.onclick = close;
  btnA.onclick = (): void => {
    close();
    onActionA();
  };
  btnB.onclick = (): void => {
    close();
    onActionB();
  };
  overlay.onclick = (e: MouseEvent): void => {
    if (e.target === overlay) close();
  };
}

export function promptSheet(
  msg: string,
  onConfirm: (val: string) => void,
  optsOrPlaceholder: PromptSheetOptions | string = {},
  isPassword?: boolean
): void {
  const opts: PromptSheetOptions = typeof optsOrPlaceholder === 'string'
    ? { placeholder: optsOrPlaceholder, isPassword: Boolean(isPassword) }
    : optsOrPlaceholder;
  const overlay = document.createElement('div');
  overlay.className = 'bottom-sheet-overlay';
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:9998;display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity 0.3s ease;';

  const cLabel = t('action.save') || 'Save';
  const xLabel = t('action.cancel') || 'Cancel';

  const content = document.createElement('div');
  content.className = 'bottom-sheet-content animate-slideUp';
  content.style.cssText =
    'background:var(--color-surface);width:100%;max-width:500px;border-radius:24px 24px 0 0;padding:24px;padding-bottom:calc(24px + env(safe-area-inset-bottom));font-family:inherit;box-shadow:0 -10px 40px rgba(0,0,0,0.1)';

  const handle = document.createElement('div');
  handle.style.cssText =
    'width:40px;height:4px;border-radius:4px;background:var(--color-outline-variant);margin:0 auto 16px;opacity:0.5';
  content.appendChild(handle);

  const text = document.createElement('p');
  text.style.cssText =
    'font-weight:700;font-size:16px;margin-bottom:16px;text-align:center;color:var(--color-on-surface)';
  text.textContent = msg;
  content.appendChild(text);

  const inputContainer = document.createElement('div');
  inputContainer.style.cssText = 'display:flex;gap:8px;margin-bottom:20px';

  let inputNode: HTMLInputElement | HTMLTextAreaElement;
  if (opts.isTextarea) {
    const textarea = document.createElement('textarea');
    textarea.rows = 3;
    textarea.style.cssText =
      'width:100%;background:var(--color-surface-container-low);border:1px solid var(--color-outline-variant);color:var(--color-on-surface);border-radius:12px;padding:12px;font-family:inherit;font-size:16px;outline:none;resize:none';
    inputNode = textarea;
  } else {
    const input = document.createElement('input');
    input.type = opts.isPassword ? 'password' : 'text';
    input.style.cssText =
      'width:100%;background:var(--color-surface-container-low);border:1px solid var(--color-outline-variant);color:var(--color-on-surface);border-radius:12px;padding:12px;font-family:inherit;font-size:16px;outline:none';
    input.autocomplete = 'off';
    inputNode = input;
  }
  inputNode.placeholder = opts.placeholder || '';
  inputContainer.appendChild(inputNode);

  let pasteBtn: HTMLButtonElement | undefined;
  if (opts.showPaste) {
    pasteBtn = document.createElement('button');
    pasteBtn.className = 'haptic-btn';
    pasteBtn.style.cssText =
      'flex-shrink:0;padding:12px;border-radius:12px;background:var(--color-primary-container);color:var(--color-on-primary-container);border:none;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:4px';

    const pasteIcon = document.createElement('span');
    pasteIcon.className = 'material-symbols-outlined';
    pasteIcon.style.cssText = 'font-size:20px';
    pasteIcon.textContent = 'content_paste';

    const pasteText = document.createTextNode(' ' + (t('action.paste') || 'Paste'));

    pasteBtn.appendChild(pasteIcon);
    pasteBtn.appendChild(pasteText);
    inputContainer.appendChild(pasteBtn);
  }

  content.appendChild(inputContainer);

  const btnContainer = document.createElement('div');
  btnContainer.style.cssText = 'display:flex;gap:12px';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'haptic-btn';
  cancelBtn.style.cssText =
    'flex:1;padding:14px;border-radius:16px;background:var(--color-surface-container-high);font-weight:700;border:none;font-size:14px;cursor:pointer;color:var(--color-on-surface);transition:all 0.15s';
  cancelBtn.textContent = xLabel;

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'haptic-btn';
  confirmBtn.style.cssText =
    'flex:1;padding:14px;border-radius:16px;background:var(--color-primary);color:var(--color-on-primary);font-weight:700;border:none;font-size:14px;cursor:pointer;transition:all 0.15s';
  confirmBtn.textContent = cLabel;

  btnContainer.appendChild(cancelBtn);
  btnContainer.appendChild(confirmBtn);
  content.appendChild(btnContainer);

  overlay.appendChild(content);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => (overlay.style.opacity = '1'));

  setTimeout(() => inputNode.focus(), 150);

  const close = (): void => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
  };

  cancelBtn.onclick = close;
  confirmBtn.onclick = (): void => {
    const val = inputNode.value.trim();
    close();
    onConfirm(val);
  };

  if (pasteBtn) {
    pasteBtn.onclick = async (): Promise<void> => {
      try {
        const text = await navigator.clipboard.readText();
        inputNode.value = text;
      } catch {
        toast(t('error.clipboard') || 'Clipboard access denied', 'error');
      }
    };
  }

  overlay.onclick = (e: MouseEvent): void => {
    if (e.target === overlay) close();
  };
}

registerToBridge('toast', toast);
registerToBridge('confirmSheet', confirmSheet);
registerToBridge('choiceSheet', choiceSheet);
registerToBridge('promptSheet', promptSheet);
