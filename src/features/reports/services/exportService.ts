import { db as DB } from '@/core/db/core';
import { t, getIntlLocale, isAppLTR, formatCategoryLabel } from '../../../i18n/engine';
import { toast, confirmSheet } from '../../../toast';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { silentFail } from '../../../core/utils';
import type { Transaction } from '@/types';

/**
 * Filters for customizing the exported data.
 */
export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  categories?: string[];
  type?: 'income' | 'expense';
}

export type ExportTransaction = Transaction & { runningBalance?: number };

/**
 * Service for exporting financial data in various formats.
 */
export const ExportService = {
  
  async exportData(format: 'csv' | 'json' | 'pdf' | 'xlsx', filters?: ReportFilters): Promise<void> {
    try {
      const rawTxns = await DB.getTransactions();
      
      // Filter out deleted transactions and drafts for all exported formats
      let txns: ExportTransaction[] = rawTxns.filter(t => !t.isDeleted && !t.isDraft);
      
      // Apply Filters
      if (filters) {
        if (filters.startDate) {
          txns = txns.filter(t => String(t.date || t.createdAt) >= filters.startDate!);
        }
        if (filters.endDate) {
          txns = txns.filter(t => String(t.date || t.createdAt) <= filters.endDate!);
        }
        if (filters.type) {
          txns = txns.filter(t => t.type === filters.type);
        }
        if (filters.categories && filters.categories.length > 0) {
          txns = txns.filter(t => filters.categories!.includes(t.category));
        }
      }

      // Calculate running balance based on chronological order (oldest first)
      txns.sort((a, b) => {
        const dateA = String(a.date || '');
        const dateB = String(b.date || '');
        if (dateA !== dateB) {
          return dateA.localeCompare(dateB);
        }
        const timeA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt || 0).getTime() || 0;
        const timeB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt || 0).getTime() || 0;
        return timeA - timeB;
      });

      let balance = 0;
      txns.forEach((tx) => {
        const amt = Number(tx.amount) || 0;
        if (tx.type === 'income') {
          balance += amt;
        } else {
          let actualAmt = amt;
          if (tx.shared && tx.splitBy && tx.splitBy > 1) {
            actualAmt = amt / tx.splitBy;
          }
          balance -= actualAmt;
        }
        tx.runningBalance = balance;
      });

      // Sort by date (Newest first) for report presentation
      txns.sort((a, b) => {
        const dateA = String(a.date || '');
        const dateB = String(b.date || '');
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
        const timeA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt || 0).getTime() || 0;
        const timeB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt || 0).getTime() || 0;
        return timeB - timeA;
      });

      const locale = getIntlLocale();
      
      if (txns.length === 0) {
        toast(t('report.exportNoData'), 'error');
        return;
      }

      toast(t('report.exportGenerating'));
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `masarifi_${dateStr}.${format}`;

      if (format === 'json') {
        const payload = JSON.stringify(txns, null, 2);
        await this.saveFileNative(payload, fileName, 'application/json');
        toast(t('report.exportJsonOk'));
      } 
      else if (format === 'csv') {
        const headers = t('report.csvHeader');
        const rows = txns.map((tx) => 
          `${tx.date || tx.createdAt},${tx.type === 'income' ? t('report.typeIncome') : t('report.typeExpense')},${formatCategoryLabel(tx.category)},"${tx.description || ''}",${tx.type === 'expense' ? tx.amount : ''},${tx.type === 'income' ? tx.amount : ''},${tx.runningBalance || 0}`
        ).join('\n');
        await this.saveFileNative(headers + rows, fileName, 'text/csv');
        toast(t('report.exportCsvOk'));
      } 
      else if (format === 'xlsx') {
        const { aoa_to_xlsx_base64, aoa_to_xlsx_download } = await import('../../../services/xlsxWriter');
        const isRtl = !isAppLTR();
        const wsData: Array<Array<string | number>> = [
          [t('report.hdrDate'), t('report.hdrType'), t('report.hdrCategory'), t('report.hdrDescription'), t('report.totalExpense') + ' (-)', t('report.totalIncome') + ' (+)', t('report.hdrRunningBalance') + ' (⚖️)']
        ];

        txns.forEach((tx) => {
          wsData.push([
            new Date(tx.date || tx.createdAt || Date.now()).toLocaleDateString(locale),
            tx.type === 'income' ? t('report.typeIncome') : t('report.typeExpense'),
            formatCategoryLabel(tx.category),
            tx.description || '',
            tx.type === 'expense' ? tx.amount : '',
            tx.type === 'income' ? tx.amount : '',
            tx.runningBalance || 0
          ]);
        });

        if (Capacitor.isNativePlatform()) {
          const base64 = aoa_to_xlsx_base64(wsData, t('report.sheetName'), isRtl);
          await this.saveFileNative(base64, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', true);
        } else {
          aoa_to_xlsx_download(wsData, fileName, t('report.sheetName'), isRtl);
        }
        toast(t('report.exportExcelOk'));
      } 
      else if (format === 'pdf') {
        toast(t('report.exportPdfLoading'));
        const { exportProfessionalPDF } = await import('../../../services/pdfExport');
        await exportProfessionalPDF(txns, this.saveFileNative.bind(this), fileName);
        toast(t('report.exportPdfOk'));
      }
    } catch (err) {
      silentFail('[ExportService] Error')(err);
      toast(t('report.exportFail'), 'error');
    }
  },

  async generateTaxReport(): Promise<void> {
    try {
      const rawTxns = await DB.getTransactions();
      // Filter out deleted and draft transactions for tax report
      const txns = rawTxns.filter(t => !t.isDeleted && !t.isDraft);
      
      if (txns.length === 0) {
        toast(t('report.exportNoData'), 'error');
        return;
      }

      const year = new Date().getFullYear();
      const fileName = `masarifi_tax_report_${year}.pdf`;

      toast(t('report.taxAnnualLoading'));
      const { exportTaxPDF } = await import('../../../services/pdfExport');
      await exportTaxPDF(txns, this.saveFileNative.bind(this), fileName, year);
      toast(t('report.taxAnnualOk'));
    } catch (err) {
      silentFail('[ExportService] Tax Report Error')(err);
      toast(t('report.taxAnnualError'), 'error');
    }
  },

  async saveFileNative(data: string, fileName: string, mimeType: string, isBase64 = false): Promise<void> {
    const isMobile = Capacitor.isNativePlatform();
    if (isMobile) {
      try {
        let savedUri: string | null = null;

        try {
          // Attempt to save to public Documents folder for user access
          const res = await Filesystem.writeFile({
            path: fileName,
            data: data,
            directory: Directory.Documents,
            encoding: isBase64 ? undefined : Encoding.UTF8
          });
          savedUri = res.uri;
        } catch (writeErr) {
          silentFail('[ExportService] Failed to write to Directory.Documents, falling back to Directory.Cache')(writeErr);
          // Fallback to Directory.Cache so the sharing sheet still functions
          const res = await Filesystem.writeFile({
            path: fileName,
            data: data,
            directory: Directory.Cache,
            encoding: isBase64 ? undefined : Encoding.UTF8
          });
          savedUri = res.uri;
        }

        // Step 1: Show save success toast so user sees it clearly
        toast(t('report.savedToDocuments') || 'تم حفظ التقرير بنجاح في المستندات 📂', 'success');

        // Step 2: Wait 1 second for the toast to be visible, then ask about sharing
        await new Promise<void>(resolve => setTimeout(resolve, 1000));

        // Step 3: Ask user if they want to share (using bottom sheet)
        const confirmMsg = t('report.shareConfirmMsg') || 'هل تريد مشاركة الملف الآن؟';
        const shareLabel = t('report.shareVia') || 'مشاركة';
        const cancelLabel = t('action.cancel') || 'لا، شكراً';

        confirmSheet(
          confirmMsg,
          async () => {
            if (savedUri) {
              try {
                await Share.share({
                  title: t('report.shareDocTitle') || 'مشاركة التقرير المالي',
                  files: [savedUri]
                });
              } catch (shareErr) {
                silentFail('[ExportService] Share error')(shareErr);
              }
            }
          },
          shareLabel,
          cancelLabel
        );
      } catch (e) {
        silentFail('[ExportService] Native save/share error')(e);
        toast(t('report.exportErrorShort') || 'فشل حفظ أو مشاركة التقرير', 'error');
      }
    } else {
      // Browser download
      let dataUri: string;
      if (isBase64) {
        dataUri = `data:${mimeType};base64,${data}`;
      } else {
        const b64 = btoa(unescape(encodeURIComponent(data)));
        dataUri = `data:${mimeType};base64,${b64}`;
      }

      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = dataUri;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
      }, 100);
      toast(t('report.downloading'));
    }
  }
};
