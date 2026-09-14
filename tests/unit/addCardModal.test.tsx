import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AddCardModal } from '@/features/cards/components/AddCardModal';
import { db as DB } from '@/core/db/core';
import type { BankCard } from '@/types';

/**
 * Characterization tests for the add/edit card sheet (632 lines).
 *
 * Written BEFORE any extraction. Two behaviours carry real weight and are what
 * these tests pin:
 *
 *  1. **Validation.** The sheet refuses a card number that is not 16 digits,
 *     a malformed expiry, or a missing CVV on a new card. A refactor that
 *     loosens any of those lets unusable data reach storage, where it fails
 *     later with no obvious cause.
 *  2. **Edit prefill and the add-vs-update branch.** Saving an edit must
 *     update the row, not create a second one — and reopening for a NEW card
 *     after an edit must start blank, or the user silently saves someone
 *     else's PAN onto a new card.
 *
 * Values are chosen so nothing collides: 4111…4321 for the seeded card and
 * 5555…9911 for the new one.
 */

const clean = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim();
const screenText = (c: HTMLElement) => clean(c.textContent);

const LABEL = {
  add: 'إضافة بطاقة جديدة',
  edit: 'تعديل البطاقة',
  save: 'حفظ البطاقة',
  update: 'تحديث البطاقة',
  cancel: 'إلغاء',
  style: 'نمط وتصميم البطاقة',
  gold: 'ذهبي ملكي',
} as const;

const PLACEHOLDER = {
  number: '0000 0000 0000 0000',
  holder: 'EX. MOHAMMED AL-RASHID',
  expiry: 'MM/YY',
  cvv: '•••',
} as const;

const CARD: BankCard = {
  id: 'card_a',
  number: '4111111111114321',
  numberMasked: '•••• •••• •••• 4321',
  holder: 'AHMED AL SAUD',
  expiry: '11/29',
  bankId: 'alrajhi',
  bankName: 'مصرف الراجحي',
  countryId: 'sa',
  countryName: 'السعودية',
  countryFlag: '🇸🇦',
  style: { bgType: 'gradient', gradientName: 'sapphire' },
};

const field = (c: HTMLElement, placeholder: string): HTMLInputElement => {
  const el = c.querySelector(`input[placeholder="${placeholder}"]`) as HTMLInputElement | null;
  if (!el) throw new Error(`No field with placeholder ${placeholder}`);
  return el;
};

const buttonByText = (c: HTMLElement, text: string) =>
  Array.from(c.querySelectorAll('button')).find((b) => clean(b.textContent) === text);

const renderModal = (props: Partial<React.ComponentProps<typeof AddCardModal>> = {}) => {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  const utils = render(
    <MemoryRouter>
      <AddCardModal
        open
        editingCard={null}
        onClose={onClose}
        onSaved={onSaved}
        {...props}
      />
    </MemoryRouter>
  );
  return { ...utils, onClose, onSaved };
};

/** Fills every required field with a valid new card. */
const fillValidCard = (c: HTMLElement) => {
  fireEvent.change(field(c, PLACEHOLDER.number), { target: { value: '5555 5555 5555 9911' } });
  fireEvent.change(field(c, PLACEHOLDER.holder), { target: { value: 'NEW HOLDER' } });
  fireEvent.change(field(c, PLACEHOLDER.expiry), { target: { value: '09/30' } });
  fireEvent.change(field(c, PLACEHOLDER.cvv), { target: { value: '123' } });
};

async function wipe() {
  await DB.transaction('rw', DB.tables, async () => {
    for (const t of DB.tables) await t.clear();
  });
  await new Promise((r) => setTimeout(r, 0));
}

describe('AddCardModal — characterization', () => {
  beforeEach(wipe);

  describe('Visibility', () => {
    it('renders nothing when closed', () => {
      const { container } = renderModal({ open: false });
      expect(container.querySelector('input')).toBeNull();
    });

    it('shows the add title for a new card', async () => {
      const { container } = renderModal();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.add));
      expect(screenText(container)).not.toContain(LABEL.edit);
      // The CVV is mandatory here, so it must NOT be marked optional.
      expect(screenText(container)).not.toContain('(اختياري)');
    });

    it('shows the edit title and prefilled fields for an existing card', async () => {
      const { container } = renderModal({ editingCard: CARD });
      await waitFor(() => expect(screenText(container)).toContain(LABEL.edit));

      expect(field(container, PLACEHOLDER.holder).value).toBe('AHMED AL SAUD');
      expect(field(container, PLACEHOLDER.expiry).value).toBe('11/29');
      expect(field(container, PLACEHOLDER.number).value.replace(/\s/g, '')).toBe(
        '4111111111114321'
      );
      // CVV is deliberately NOT restored: it is never stored in plain form...
      expect(field(container, PLACEHOLDER.cvv).value).toBe('');
      // ...and the field is marked optional, so the user is not left guessing
      // why a blank CVV is accepted here but rejected on a new card.
      expect(screenText(container)).toContain('(اختياري)');
    });
  });

  describe('Validation', () => {
    it('refuses a card number shorter than 16 digits', async () => {
      const { container, onSaved } = renderModal();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.add));

      fillValidCard(container);
      fireEvent.change(field(container, PLACEHOLDER.number), { target: { value: '4111 1111' } });
      fireEvent.click(buttonByText(container, LABEL.save) as Element);

      await new Promise((r) => setTimeout(r, 50));
      expect(onSaved).not.toHaveBeenCalled();
      expect(await DB.cards.count()).toBe(0);
    });

    it('refuses a malformed expiry', async () => {
      const { container, onSaved } = renderModal();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.add));

      fillValidCard(container);
      fireEvent.change(field(container, PLACEHOLDER.expiry), { target: { value: '9' } });
      fireEvent.click(buttonByText(container, LABEL.save) as Element);

      await new Promise((r) => setTimeout(r, 50));
      expect(onSaved).not.toHaveBeenCalled();
      expect(await DB.cards.count()).toBe(0);
    });

    it('requires a CVV on a NEW card', async () => {
      const { container, onSaved } = renderModal();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.add));

      fillValidCard(container);
      fireEvent.change(field(container, PLACEHOLDER.cvv), { target: { value: '' } });
      fireEvent.click(buttonByText(container, LABEL.save) as Element);

      await new Promise((r) => setTimeout(r, 50));
      expect(onSaved).not.toHaveBeenCalled();
      expect(await DB.cards.count()).toBe(0);
    });

    it('does NOT require a CVV when editing, since it was never stored', async () => {
      await DB.cards.put(CARD as never);
      const { container, onSaved } = renderModal({ editingCard: CARD });
      await waitFor(() => expect(screenText(container)).toContain(LABEL.edit));

      fireEvent.change(field(container, PLACEHOLDER.holder), { target: { value: 'RENAMED' } });
      fireEvent.click(buttonByText(container, LABEL.update) as Element);

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      const row = (await DB.cards.get('card_a')) as BankCard | undefined;
      expect(row?.holder).toBe('RENAMED');
    });
  });

  describe('Saving', () => {
    it('adds a new card and reports it as new', async () => {
      const { container, onSaved, onClose } = renderModal();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.add));

      fillValidCard(container);
      fireEvent.click(buttonByText(container, LABEL.save) as Element);

      await waitFor(async () => {
        expect(await DB.cards.count()).toBe(1);
      });
      // The parent needs to know it was an add, so it can select the new card.
      expect(onSaved).toHaveBeenCalledWith(expect.any(String), true);
      expect(onClose).toHaveBeenCalled();

      const [row] = (await DB.cards.toArray()) as BankCard[];
      expect(row.number).toBe('5555555555559911');
      expect(row.numberMasked).toContain('9911');
      expect(row.holder).toBe('NEW HOLDER');
    });

    it('UPDATES an edited card rather than adding a second one', async () => {
      await DB.cards.put(CARD as never);
      const { container, onSaved } = renderModal({ editingCard: CARD });
      await waitFor(() => expect(screenText(container)).toContain(LABEL.edit));

      fireEvent.change(field(container, PLACEHOLDER.holder), { target: { value: 'UPDATED NAME' } });
      fireEvent.click(buttonByText(container, LABEL.update) as Element);

      await waitFor(() => expect(onSaved).toHaveBeenCalledWith('card_a', false));
      // Still one card: an add-instead-of-update would make two.
      expect(await DB.cards.count()).toBe(1);
      expect(((await DB.cards.get('card_a')) as BankCard).holder).toBe('UPDATED NAME');
    });

    it('falls back to a placeholder when the holder is blank', async () => {
      const { container } = renderModal();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.add));

      fillValidCard(container);
      fireEvent.change(field(container, PLACEHOLDER.holder), { target: { value: '   ' } });
      fireEvent.click(buttonByText(container, LABEL.save) as Element);

      await waitFor(async () => expect(await DB.cards.count()).toBe(1));
      const [row] = (await DB.cards.toArray()) as BankCard[];
      expect(row.holder).toBe('HOLDER NAME');
    });

    it('uppercases a lowercase holder name, as embossed cards are', async () => {
      // NOTE on coverage: the `.toUpperCase()` inside handleSave is an
      // EQUIVALENT mutation -- verified by reading the field, whose onChange,
      // onBlur and onCompositionEnd all uppercase on the way in, so the state
      // is never lowercase by the time save runs. The call is defence in depth
      // for a future code path that sets the value directly. This test pins
      // the user-visible outcome, which is what matters.
      const { container } = renderModal();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.add));

      fillValidCard(container);
      fireEvent.change(field(container, PLACEHOLDER.holder), {
        target: { value: 'mohammed al rashid' },
      });
      fireEvent.click(buttonByText(container, LABEL.save) as Element);

      await waitFor(async () => expect(await DB.cards.count()).toBe(1));
      const [row] = (await DB.cards.toArray()) as BankCard[];
      expect(row.holder).toBe('MOHAMMED AL RASHID');
    });
  });

  describe('Card preview and style picker', () => {
    it('flips the preview when it is clicked', async () => {
      const { container } = renderModal();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.add));

      // The preview wrapper is the clickable ancestor of the 3D card. Selecting
      // the first `div[role=button]` on the page instead lands on a style-picker
      // swatch, which does not flip anything.
      const inner = container.querySelector('.card-3d-inner');
      expect(inner).toBeTruthy();
      const flip = inner?.closest('div[role="button"]');
      expect(flip).toBeTruthy();

      const before = inner?.className ?? '';
      fireEvent.click(flip as Element);
      await waitFor(() => {
        const after = container.querySelector('.card-3d-inner')?.className ?? '';
        expect(after).not.toBe(before);
      });
    });

    it('flips to the back when the CVV field takes focus', async () => {
      // The CVV is printed on the reverse, so focusing the field must turn the
      // card over -- otherwise the user is typing a number they cannot see
      // against a picture of the front.
      const { container } = renderModal();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.add));

      const before = container.querySelector('.card-3d-inner')?.className ?? '';
      fireEvent.focus(field(container, PLACEHOLDER.cvv));

      await waitFor(() => {
        const after = container.querySelector('.card-3d-inner')?.className ?? '';
        expect(after).not.toBe(before);
      });

      // ...and back to the front when focus leaves.
      fireEvent.blur(field(container, PLACEHOLDER.cvv));
      await waitFor(() => {
        expect(container.querySelector('.card-3d-inner')?.className ?? '').toBe(before);
      });
    });

    it('surfaces BIN auto-detection progress while a number is typed', async () => {
      // The lookup runs on the first six digits. Whatever the network does,
      // the "detecting" indicator must appear -- a frozen status prop leaves
      // the user with no feedback at all during the pause.
      const { container } = renderModal();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.add));

      fireEvent.change(field(container, PLACEHOLDER.number), {
        target: { value: '4111 11' },
      });

      await waitFor(() => {
        expect(screenText(container)).toContain('جاري التحقق من تفاصيل البطاقة تلقائياً...');
      });
    });

    it('mirrors the typed number and holder into the live preview', async () => {
      // The preview exists to show what will be saved. A frozen prop leaves it
      // showing placeholder digits while the user types a real card, which is
      // exactly the kind of silent divergence an extraction introduces.
      const { container } = renderModal();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.add));

      const inner = container.querySelector('.card-3d-inner');
      expect(inner).toBeTruthy();
      expect(clean(inner?.textContent)).not.toContain('9911');

      fillValidCard(container);

      await waitFor(() => {
        const preview = clean(container.querySelector('.card-3d-inner')?.textContent);
        expect(preview).toContain('9911');
        expect(preview).toContain('NEW HOLDER');
      });
    });

    it('offers every style and applies the chosen one to the saved card', async () => {
      const { container } = renderModal();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.style));

      // The gold style must be listed...
      expect(screenText(container)).toContain(LABEL.gold);

      // ...and the picker must show which style is currently active. The
      // default is slate; a frozen `styleName` prop would keep highlighting it
      // even after another swatch is chosen.
      const swatchFor = (label: string) =>
        Array.from(container.querySelectorAll('button')).find((b) =>
          clean(b.textContent).includes(label)
        ) as HTMLButtonElement;
      const goldSwatch = swatchFor(LABEL.gold);
      const before = goldSwatch.getAttribute('style') ?? '';
      // The gold gradient, taken from the source list so the assertion cannot
      // drift from the real palette.
      const goldStyleMarker = (
        await import('@/features/cards/data/cardConstants')
      ).CARD_STYLES.find((x) => x.id === 'gold')!.glowColor;
      const goldBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        clean(b.textContent).includes(LABEL.gold)
      );
      expect(goldBtn).toBeTruthy();
      fireEvent.click(goldBtn as Element);

      // The selected swatch gains its highlight border/glow...
      await waitFor(() => {
        expect(swatchFor(LABEL.gold).getAttribute('style') ?? '').not.toBe(before);
      });

      // ...and the PREVIEW repaints in the chosen style. Asserted after a
      // selection because CARD_STYLES[0] is the default, so a frozen
      // activeStyle is indistinguishable until the user picks something else.
      await waitFor(() => {
        const card = container.querySelector('.card-3d-inner')?.innerHTML ?? '';
        expect(card).toContain(goldStyleMarker);
      });

      fillValidCard(container);
      fireEvent.click(buttonByText(container, LABEL.save) as Element);

      await waitFor(async () => expect(await DB.cards.count()).toBe(1));
      const [row] = (await DB.cards.toArray()) as BankCard[];
      // ...and the selection must survive into storage.
      expect(row.style.gradientName).toBe('gold');
    });
  });

  describe('Dismissal', () => {
    it('closes without saving when cancel is pressed', async () => {
      const { container, onClose, onSaved } = renderModal();
      await waitFor(() => expect(screenText(container)).toContain(LABEL.add));

      fillValidCard(container);
      fireEvent.click(buttonByText(container, LABEL.cancel) as Element);

      expect(onClose).toHaveBeenCalled();
      expect(onSaved).not.toHaveBeenCalled();
      expect(await DB.cards.count()).toBe(0);
    });
  });
});
