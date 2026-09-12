import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../../src/components/ui/ErrorBoundary';
import * as crashlyticsModule from '../../src/core/crashlytics';

// Helper component that can throw on demand
function FaultyComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test Explosion in Feature');
  }
  return <div data-testid="healthy-content">All systems operational</div>;
}

describe('ErrorBoundary Component Tests', () => {
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    // Suppress React's internal console.error output during intentional error boundary tests
    originalConsoleError = console.error;
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    vi.restoreAllMocks();
  });

  it('renders children normally when there are no errors', () => {
    render(
      <ErrorBoundary>
        <FaultyComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('healthy-content')).toBeInTheDocument();
  });

  it('catches errors and renders inline error boundary fallback with feature name', () => {
    render(
      <ErrorBoundary variant="inline" featureName="التقارير المالية">
        <FaultyComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Verify feature name is displayed in error fallback
    expect(screen.getByText(/تعذر تحميل التقارير المالية/i)).toBeInTheDocument();
    expect(screen.getByText(/إعادة المحاولة/i)).toBeInTheDocument();
    expect(screen.queryByTestId('healthy-content')).not.toBeInTheDocument();
  });

  it('catches errors and renders full-page error boundary fallback', () => {
    render(
      <ErrorBoundary variant="full">
        <FaultyComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/حدث خطأ غير متوقع/i)).toBeInTheDocument();
    expect(screen.getByText(/إعادة المحاولة/i)).toBeInTheDocument();
  });

  it('records exception via unified crashlytics when error occurs', () => {
    const recordSpy = vi.spyOn(crashlyticsModule, 'recordException');

    render(
      <ErrorBoundary variant="inline" featureName="مركز الألعاب">
        <FaultyComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(recordSpy).toHaveBeenCalledWith(
      'Test Explosion in Feature',
      expect.any(Error)
    );
  });

  it('allows user to retry and recover after error condition is resolved', () => {
    function StatefulTestWrapper() {
      const [explode, setExplode] = useState(true);
      return (
        <div>
          <button onClick={() => setExplode(false)}>Fix Error</button>
          <ErrorBoundary variant="inline" featureName="الميزانيات">
            <FaultyComponent shouldThrow={explode} />
          </ErrorBoundary>
        </div>
      );
    }

    render(<StatefulTestWrapper />);

    // Initially in error state
    expect(screen.getByText(/تعذر تحميل الميزانيات/i)).toBeInTheDocument();

    // Fix the error condition in state
    fireEvent.click(screen.getByText('Fix Error'));

    // Click retry on ErrorBoundary
    fireEvent.click(screen.getByText('إعادة المحاولة'));

    // Should now render the healthy content
    expect(screen.getByTestId('healthy-content')).toBeInTheDocument();
  });
});
