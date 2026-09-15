import { toast } from '../../../toast';
import { silentFail } from '../../../core/utils';
import { oklchToRgb, oklabToRgb } from '../../reports/utils/colorUtils';
import { ExportService } from '../../reports/services/exportService';

/**
 * Directive 19 — deferred decomposition: the element→PDF pipeline.
 *
 * This exact sequence used to live twice — once in Assets.tsx and once in
 * AssetDetailModal.tsx — as two ~150-line copies that differed only in the
 * element id, the file name, the toast texts and one hex literal. It is the
 * html2canvas gauntlet this app's Obsidian theme demands:
 *
 *   1. oklch/oklab colors crash html2canvas → a scoped getComputedStyle
 *      Proxy converts every color property to rgb for the duration.
 *   2. backdrop-filter renders as garbage → stripped from every descendant,
 *      with the original inline styles saved and restored in `finally`.
 *   3. The mobile layout is too narrow for a readable A4 → the container is
 *      forced to a 1200px desktop width for the capture, then restored.
 *   4. Long pages paginate: the canvas is sliced into A4-height pages.
 *   5. Native builds save through ExportService; the browser just saves.
 *
 * Everything is restored in `finally` — including window.getComputedStyle —
 * so even a thrown export cannot leak the Proxy into the rest of the app.
 * tests/unit/assetModals.test.tsx drives this end-to-end with jspdf and
 * html2canvas mocked at the module boundary.
 */

export interface ExportElementAsPdfOptions {
  /** The DOM id of the container to capture. */
  elementId: string;
  /** Final file name (caller builds it — dates, sanitized names). */
  fileName: string;
  /** Success toast text (already translated at the call site). */
  successToast: string;
  /** Failure toast text (already translated at the call site). */
  errorToast: string;
  /** Label for the silentFail capture — names the caller in the logs. */
  errorLabel: string;
  /**
   * Dark-mode backdrop forced onto the container during capture. The two
   * historical callers differ ('#111827' for the assets page, '#1e2124' for
   * the detail modal) and the difference is preserved on purpose — each
   * matches its screen's dark surface.
   */
  darkBackground?: string;
  /** Drives the caller's spinner state around the export. */
  onExportingChange?: (exporting: boolean) => void;
}

export async function exportElementAsPdf({
  elementId,
  fileName,
  successToast,
  errorToast,
  errorLabel,
  darkBackground = '#1e2124',
  onExportingChange,
}: ExportElementAsPdfOptions): Promise<void> {
  onExportingChange?.(true);
  const element = document.getElementById(elementId);
  if (!element) { onExportingChange?.(false); return; }

  // تزييف مؤقت لـ getComputedStyle لتصفية وتحويل ألوان oklch و oklab إلى rgb لتفادي استثناءات html2canvas باستخدام Proxy محكم
  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = function (el: Element, pseudoElt?: string | null): CSSStyleDeclaration {
    const style = originalGetComputedStyle(el, pseudoElt);

    const colorProps = [
      'backgroundColor', 'color', 'borderColor',
      'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
      'outlineColor', 'fill', 'stroke'
    ];

    return new Proxy(style, {
      get(target, prop) {
        if (prop === 'getPropertyValue') {
          return function(propertyName: string) {
            const val = target.getPropertyValue(propertyName);
            if (typeof val === 'string') {
              if (val.includes('oklch')) return oklchToRgb(val);
              if (val.includes('oklab')) return oklabToRgb(val);
            }
            return val;
          };
        }

        const value = Reflect.get(target, prop);
        if (typeof value === 'function') {
          return value.bind(target);
        }

        if (typeof prop === 'string') {
          const isColorProp = colorProps.includes(prop) ||
            prop.toLowerCase().includes('color') ||
            prop === 'fill' || prop === 'stroke';
          if (isColorProp && typeof value === 'string') {
            if (value.includes('oklch')) return oklchToRgb(value);
            if (value.includes('oklab')) return oklabToRgb(value);
          }
        }

        return value;
      }
    });
  };

  // حفظ الأنماط الأصلية للعناصر التي تعيق html2canvas (مثل الـ backdropFilter)
  const savedStyles: { el: HTMLElement; backdropFilter: string; background: string }[] = [];
  const allEls = element.querySelectorAll<HTMLElement>('*');
  allEls.forEach(el => {
    const cs = window.getComputedStyle(el);
    if (cs.backdropFilter && cs.backdropFilter !== 'none') {
      savedStyles.push({ el, backdropFilter: el.style.backdropFilter, background: el.style.background });
      el.style.backdropFilter = 'none';
      el.style.setProperty('-webkit-backdrop-filter', 'none');
      if (!el.style.background) el.style.background = '#ffffff';
    }
  });

  const origStyle = {
    backdropFilter: element.style.backdropFilter,
    background: element.style.background,
    boxShadow: element.style.boxShadow,
  };
  element.style.backdropFilter = 'none';
  element.style.setProperty('-webkit-backdrop-filter', 'none');
  element.style.background = document.documentElement.classList.contains('dark') ? darkBackground : '#ffffff';
  element.style.boxShadow = 'none';

  // حفظ تنسيقات العرض والأبعاد الأصلية للحاوية لفرض مظهر سطح المكتب
  const originalWidth = element.style.width;
  const originalMaxWidth = element.style.maxWidth;
  const originalMinWidth = element.style.minWidth;

  element.classList.add('force-desktop-print');
  element.style.width = '1200px';
  element.style.maxWidth = '1200px';
  element.style.minWidth = '1200px';

  // إعطاء مهلة قصيرة للمتصفح لإعادة رسم الحاوية بالتنسيق العريض الجديد قبل الالتقاط
  await new Promise(resolve => setTimeout(resolve, 50));

  try {
    const { jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: document.documentElement.classList.contains('dark') ? darkBackground : '#ffffff',
      foreignObjectRendering: false,
      ignoreElements: (el: Element) => el.classList.contains('no-print'),
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const doc = new jsPDF('p', 'mm', 'a4');
    let heightLeft = imgHeight;
    let position = 0;
    doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      doc.addPage();
      doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      await ExportService.saveFileNative(pdfBase64, fileName, 'application/pdf', true);
    } else {
      doc.save(fileName);
    }
    toast(successToast, 'success');
  } catch (error) {
    silentFail(errorLabel)(error);
    toast(errorToast, 'error');
  } finally {
    // استعادة الدالة الأصلية لـ getComputedStyle
    window.getComputedStyle = originalGetComputedStyle;

    // استعادة فئات التجاوز وعرض سطح المكتب الأصلي
    element.classList.remove('force-desktop-print');
    element.style.width = originalWidth;
    element.style.maxWidth = originalMaxWidth;
    element.style.minWidth = originalMinWidth;

    // استعادة الأنماط الأصلية
    savedStyles.forEach(({ el, backdropFilter, background }) => {
      el.style.backdropFilter = backdropFilter;
      el.style.setProperty('-webkit-backdrop-filter', backdropFilter);
      el.style.background = background;
    });

    element.style.backdropFilter = origStyle.backdropFilter;
    element.style.setProperty('-webkit-backdrop-filter', origStyle.backdropFilter);
    element.style.background = origStyle.background;
    element.style.boxShadow = origStyle.boxShadow;
    onExportingChange?.(false);
  }
}
