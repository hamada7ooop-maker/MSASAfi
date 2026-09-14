import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db as DB } from '@/core/db/core';
import { BillModal } from '@/features/bills/components/BillModal';
import { GoalModal } from '@/features/goals/components/GoalModal';
import { DebtModal } from '@/features/debts/components/DebtModal';
import { ChallengeModal } from '@/features/challenges/components/ChallengeModal';
import { AssetFormModal } from '@/features/assets/components/AssetFormModal';
import { AddCardModal } from '@/features/cards/components/AddCardModal';
import { InfoModal } from '@/components/ui/InfoModal';

/**
 * Directive 15 Option B / Directive 16 bonus — modal backdrop & dialog
 * sibling refactor (the 25 propagation-guard panels).
 *
 * Characterization tests written BEFORE the refactor. They pin the two
 * behaviours a user can actually perform on every modal panel:
 *
 *   1. Clicking the dialog body does NOT close the modal (an accidental
 *      click inside a form must not throw away the user's input).
 *   2. Clicking the backdrop area DOES close it.
 *
 * The locators are deliberately structure-agnostic: today the dialog is a
 * click-eater child of the backdrop (stopPropagation); after the refactor the
 * backdrop is an absolute sibling of the dialog. Both structures must pass
 * these tests unchanged — that is the definition of "behaviour-preserving".
 */

/** The outermost fixed overlay container (Tailwind-styled or inline-styled). */
const overlayOf = (c: HTMLElement): HTMLElement | null => {
  const tw = c.querySelector('div[class*="fixed"][class*="inset-0"]');
  if (tw) return tw as HTMLElement;
  // Inline-styled overlays (e.g. AddCardModal): derive from the dialog.
  const dialog = c.querySelector('[role="dialog"]');
  return (dialog?.parentElement as HTMLElement) ?? null;
};

/** The dialog: explicit role when present on a descendant, else the max-w container. */
const dialogOf = (overlay: HTMLElement): HTMLElement | null => {
  const byRole = overlay.querySelector(':scope [role="dialog"]');
  if (byRole) return byRole as HTMLElement;
  return (overlay.querySelector('div[class*="max-w"]') as HTMLElement) ?? null;
};

/**
 * The backdrop: after the sibling refactor it is an `absolute inset-0` child
 * of the overlay; before it, the overlay itself carries the click handler.
 */
const backdropOf = (overlay: HTMLElement): HTMLElement =>
  (overlay.querySelector(':scope > div.absolute.inset-0') as HTMLElement | null) ?? overlay;

async function wipe() {
  await DB.transaction('rw', DB.tables, async () => {
    for (const t of DB.tables) await t.clear();
  });
  await new Promise((r) => setTimeout(r, 0));
}

describe('Directive 16 bonus — modal panels: dialog shield vs backdrop close', () => {
  beforeEach(async () => {
    await wipe();
  });

  const cases: Array<{ name: string; render: (onClose: () => void) => React.ReactElement }> = [
    {
      name: 'BillModal',
      render: (onClose) => <BillModal onClose={onClose} onSave={vi.fn()} />,
    },
    {
      name: 'GoalModal',
      render: (onClose) => (
        <GoalModal isOpen onClose={onClose} goalToEdit={null} accounts={[]} onSave={vi.fn(async () => undefined)} />
      ),
    },
    {
      name: 'DebtModal',
      render: (onClose) => (
        <DebtModal isOpen onClose={onClose} debtToEdit={null} accounts={[]} onSave={vi.fn(async () => undefined)} />
      ),
    },
    {
      name: 'ChallengeModal',
      render: (onClose) => (
        <ChallengeModal onClose={onClose} onSave={vi.fn()} />
      ),
    },
    {
      name: 'AssetFormModal',
      render: (onClose) => (
        <AssetFormModal asset={null} onClose={onClose} onSave={vi.fn()} />
      ),
    },
    {
      name: 'AddCardModal',
      render: (onClose) => (
        <AddCardModal open editingCard={null} onClose={onClose} onSaved={vi.fn()} />
      ),
    },
    {
      name: 'InfoModal (home widgets)',
      render: (onClose) => (
        <InfoModal isOpen onClose={onClose} title="Title" description="Description" />
      ),
    },
  ];

  for (const { name, render: renderModal } of cases) {
    it(`${name}: clicking the dialog body does not close; clicking the backdrop does`, () => {
      const onClose = vi.fn();
      const { container } = render(
        <MemoryRouter>{renderModal(onClose)}</MemoryRouter>
      );

      const overlay = overlayOf(container);
      expect(overlay).not.toBeNull();
      const dialog = dialogOf(overlay);
      expect(dialog).not.toBeNull();

      // 1. A click inside the dialog must never reach the close handler.
      fireEvent.click(dialog);
      expect(onClose).not.toHaveBeenCalled();

      // 2. A click on the backdrop area closes the modal.
      fireEvent.click(backdropOf(overlay));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  }
});
