import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast, confirmSheet, choiceSheet, promptSheet } from '../../src/toast';

describe('Toast & Bottom Sheet Dialogs Unit Tests (toast.ts)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('toast', () => {
    it('creates and renders toast elements for different types', () => {
      toast('Success Alert', 'success');
      toast('Error Alert', 'error');
      toast('Warning Alert', 'warning');
      toast('Info Alert', 'info');

      const toasts = document.querySelectorAll('.masarifi-toast');
      expect(toasts.length).toBe(4);
      expect(document.body.textContent).toContain('Success Alert');
      expect(document.body.textContent).toContain('Error Alert');
    });
  });

  describe('confirmSheet', () => {
    it('renders confirmation dialog and triggers onConfirm callback', () => {
      const onConfirm = vi.fn();
      confirmSheet('Are you sure you want to delete this?', onConfirm, 'Yes, Delete', 'Cancel');

      const overlay = document.querySelector('.bottom-sheet-overlay');
      expect(overlay).not.toBeNull();
      expect(document.body.textContent).toContain('Are you sure you want to delete this?');

      const buttons = document.querySelectorAll('.bottom-sheet-content button');
      expect(buttons.length).toBe(2);

      // Click confirm button
      const confirmBtn = Array.from(buttons).find((b) => b.textContent === 'Yes, Delete') as HTMLButtonElement;
      confirmBtn.click();
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('choiceSheet', () => {
    it('renders choice sheet and executes action A or action B', () => {
      const onActionA = vi.fn();
      const onActionB = vi.fn();
      choiceSheet('Choose export format', onActionA, onActionB, 'PDF', 'Excel');

      expect(document.body.textContent).toContain('Choose export format');
      expect(document.body.textContent).toContain('PDF');
      expect(document.body.textContent).toContain('Excel');

      const buttons = document.querySelectorAll('.bottom-sheet-content button');
      const pdfBtn = Array.from(buttons).find((b) => b.textContent?.includes('PDF')) as HTMLButtonElement;
      pdfBtn.click();
      expect(onActionA).toHaveBeenCalledTimes(1);
    });
  });

  describe('promptSheet', () => {
    it('renders text and password prompts and submits user value', () => {
      const onConfirm = vi.fn();
      promptSheet('Enter your name', onConfirm, { placeholder: 'Name here' });

      const input = document.querySelector('input') as HTMLInputElement;
      expect(input).not.toBeNull();
      input.value = 'Mohamed';

      const buttons = document.querySelectorAll('.bottom-sheet-content button');
      const saveBtn = buttons[buttons.length - 1] as HTMLButtonElement;
      saveBtn.click();

      expect(onConfirm).toHaveBeenCalledWith('Mohamed');
    });

    it('renders textarea prompt with showPaste option', () => {
      const onConfirm = vi.fn();
      promptSheet('Enter transaction note', onConfirm, { isTextarea: true, showPaste: true });

      const textarea = document.querySelector('textarea');
      expect(textarea).not.toBeNull();

      const pasteBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Paste') || b.textContent?.includes('لصق'));
      expect(pasteBtn).toBeDefined();
    });
  });
});
