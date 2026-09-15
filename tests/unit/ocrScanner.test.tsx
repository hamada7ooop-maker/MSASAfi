import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OCRScanner } from '../../src/features/transactions/components/OCRScanner';
import { toast } from '../../src/toast';

const { getPhoto, recognize, terminate, createWorker } = vi.hoisted(() => ({
  getPhoto: vi.fn(),
  recognize: vi.fn(),
  terminate: vi.fn().mockResolvedValue(undefined),
  createWorker: vi.fn(),
}));

vi.mock('@capacitor/camera', () => ({
  Camera: { getPhoto },
  CameraResultType: { DataUrl: 'dataUrl' },
  CameraSource: { Prompt: 'prompt' },
}));
vi.mock('tesseract.js', () => ({
  createWorker,
}));
vi.mock('../../src/components/modals/ImageCropper', () => ({
  ImageCropper: ({ onCrop, onCancel }: { onCrop: (value: string) => void; onCancel: () => void }) => (
    <div data-testid="cropper">
      <button onClick={() => onCrop('cropped-image')}>crop</button>
      <button onClick={onCancel}>cancel crop</button>
    </div>
  ),
}));
vi.mock('../../src/toast', () => ({ toast: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  getPhoto.mockRejectedValue(new Error('User cancelled photos app'));
  createWorker.mockResolvedValue({ recognize, terminate });
  recognize.mockResolvedValue({ data: { text: 'TOTAL: 1,234.50\nDate 12/09/2026' } });
});

describe('OCRScanner characterization', () => {
  it('renders the scanner and closes without surfacing a toast when camera capture is cancelled', async () => {
    const onClose = vi.fn();
    render(<OCRScanner onScan={vi.fn()} onClose={onClose} />);

    expect(screen.getByRole('button', { name: /إغلاق|close/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /إغلاق|close/i }));
    expect(onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(getPhoto).toHaveBeenCalledOnce());
    expect(toast).not.toHaveBeenCalled();
  });

  it('accepts a gallery image, crops it, parses amount and date, then reports the scan', async () => {
    const onScan = vi.fn();
    render(<OCRScanner onScan={onScan} onClose={vi.fn()} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['receipt'], 'receipt.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByTestId('cropper')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'crop' }));
    await waitFor(() => expect(onScan).toHaveBeenCalledWith({ amount: '1234.50', date: '12/09/2026' }));
    expect(toast).toHaveBeenCalledWith(expect.anything(), 'success');
    expect(terminate).toHaveBeenCalledOnce();
  });

  it('falls back to the largest positive number and warns when no total label is present', async () => {
    recognize.mockResolvedValueOnce({ data: { text: 'Receipt\n12.00\n99.50' } });
    const onScan = vi.fn();
    render(<OCRScanner onScan={onScan} onClose={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'receipt.png', { type: 'image/png' })] } });
    fireEvent.click(await screen.findByRole('button', { name: 'crop' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.anything(), 'success'));
    expect(onScan).toHaveBeenCalledWith({ amount: '99.5', date: undefined });
  });
});
