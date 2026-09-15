import { safeInnerHTML } from '../core/security';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';
import { getIntlLocale, isAppLTR, t, formatCategoryLabel } from '../i18n/engine';
import { fmtRaw } from '../core/utils';
import { getCategoryIcon } from '../core/categoryUtils';
import type { Transaction } from '@/types';

const APP_LOGO =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzAwMmI1OSI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDIzIDJ6bTAgMThjLTQuNDEgMC04LTMuNTktOC04czMuNTktOCA4LTggOCAzLjU5IDggOC0zLjU5IDgtOCA4em0uMzEtOC44NmMxLjA0LjQ2IDEuOSAxLjA3IDEuOSAyLjA2IDAgMS4wNi0uODYgMS45MS0yLjIxIDIuMTJWMTdIMTEuMnYtMS42Yy0xLjI1LS4xNy0yLjE4LS44My0yLjU0LTEuNTRMMTAuNCAxM2MuMjQuNDcgMS4wMS45OSAyLjIuOTkgMS4yOSAwIDEuOTktLjYzIDEuOTktMS4zMiAwLS43MS0uNy0xLjE3LTIuMTItMS43NS0xLjcxLS43MS0yLjY3LTEuNTQtMi42Ny0yLjc0IDAtMS4yMyAxLjAyLTIuMDIgMi40LTIuMjVWNEgxMi44djEuNTZjMS4wNy4xNyAxLjkuNyAyLjM0IDEuNDRsLTEuNzEuNjhjLS4yNi0uNDItLjg1LS44NC0xLjgzLS44NC0xLjE3IDAtMS44NS41Ny0xLjg1IDEuMjMgMCAuNjcuNiAxLjAzIDIuMTEgMS42N3oiLz48L3N2Zz4=';

export type SaveFileNativeFn = (
  data: string,
  fileName: string,
  mimeType: string,
  share: boolean
) => Promise<void>;

export async function exportProfessionalPDF(
  txns: Transaction[],
  saveFileNativeFn?: SaveFileNativeFn,
  fileName = 'report.pdf'
): Promise<void> {
  const locale = getIntlLocale();
  const isRtl = !isAppLTR();

  // Calculate Global Summary
  let totalIncome = 0;
  let totalExpense = 0;
  const categorySummary: Record<string, { amount: number; type: string }> = {};

  txns.forEach((tx) => {
    if (tx.type === 'income') totalIncome += tx.amount;
    else totalExpense += tx.amount;

    if (!categorySummary[tx.category]) {
      categorySummary[tx.category] = { amount: 0, type: tx.type };
    }
    categorySummary[tx.category].amount += tx.amount;
  });

  const topCategories = Object.keys(categorySummary)
    .map((cat) => ({ name: cat, ...categorySummary[cat] }))
    .filter((c) => c.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  if (document.fonts) await document.fonts.load('16px "IBM Plex Sans Arabic"');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-5000px;top:0;width:210mm;background:white;';
  document.body.appendChild(container);

  let currentTxnIndex = 0;
  let pageNum = 1;
  const totalTxns = txns.length;

  while (currentTxnIndex < totalTxns) {
    const pageDiv = document.createElement('div');
    pageDiv.dir = isRtl ? 'rtl' : 'ltr';
    pageDiv.style.cssText = `width:210mm;padding:20mm;background:white;min-height:297mm;box-sizing:border-box;font-family:'IBM Plex Sans Arabic', sans-serif;position:relative;overflow:hidden;`;

    // Watermark
    const watermark = document.createElement('div');
    watermark.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 150px; font-weight: 900; color: rgba(0, 43, 89, 0.04);
      white-space: nowrap; pointer-events: none; z-index: 9999; text-transform: uppercase; letter-spacing: 12px;
    `;
    watermark.innerText = 'Masarifi';
    pageDiv.appendChild(watermark);

    const contentWrapper = document.createElement('div');
    contentWrapper.style.cssText =
      'position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column;';
    pageDiv.appendChild(contentWrapper);

    // Header
    const headerHtml = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #002b59; padding-bottom: 15px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 18px;">
          <img src="${APP_LOGO}" style="width: 45px; height: 45px;" />
          <div>
            <div style="font-size: 22px; font-weight: 900; color: #002b59;">${t('report.pdfTitle')}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${t('report.id')}: ${Math.random()
      .toString(36)
      .substring(2, 9)
      .toUpperCase()}</div>
          </div>
        </div>
        <div style="text-align: ${isRtl ? 'left' : 'right'}; font-size: 10px; color: #64748b;">
          <div style="font-weight: bold; color: #002b59; margin-bottom: 2px;">${new Date().toLocaleDateString(
            locale,
            { year: 'numeric', month: 'long', day: 'numeric' }
          )}</div>
          <div class="page-count-placeholder">Page ${pageNum}</div>
        </div>
      </div>
    `;

    let summaryHtml = '';
    if (pageNum === 1) {
      summaryHtml = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
          <div style="padding: 15px; background: #f0fdf4; border-radius: 16px; border: 1px solid #bbf7d0; text-align: center;">
            <div style="font-size: 10px; color: #166534; font-weight: 800; margin-bottom: 4px; text-transform: uppercase;">💰 ${t(
              'report.totalIncome'
            )}</div>
            <div style="font-size: 18px; font-weight: 900; color: #15803d;">+${fmtRaw(totalIncome)}</div>
          </div>
          <div style="padding: 15px; background: #fef2f2; border-radius: 16px; border: 1px solid #fecaca; text-align: center;">
            <div style="font-size: 10px; color: #991b1b; font-weight: 800; margin-bottom: 4px; text-transform: uppercase;">💸 ${t(
              'report.totalExpense'
            )}</div>
            <div style="font-size: 18px; font-weight: 900; color: #b91c1c;">-${fmtRaw(totalExpense)}</div>
          </div>
          <div style="padding: 15px; background: #eff6ff; border-radius: 16px; border: 1px solid #bfdbfe; text-align: center;">
            <div style="font-size: 10px; color: #1e40af; font-weight: 800; margin-bottom: 4px; text-transform: uppercase;">⚖️ ${t(
              'report.netBalance'
            )}</div>
            <div style="font-size: 18px; font-weight: 900; color: #1d4ed8;">${fmtRaw(
              totalIncome - totalExpense
            )}</div>
          </div>
        </div>

        <div style="margin-bottom: 25px; background: #f8fafc; padding: 20px; border-radius: 20px; border: 1px solid #e2e8f0;">
          <h4 style="font-size: 14px; font-weight: 900; color: #1e293b; margin-bottom: 18px; display: flex; align-items: center; gap: 8px;">
            <span style="width: 4px; height: 14px; background: #002b59; border-radius: 2px;"></span>
            ${t('report.topSpending')}
          </h4>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${topCategories
              .map((cat) => {
                const percentage = totalExpense > 0 ? ((cat.amount / totalExpense) * 100).toFixed(0) : '0';
                return `
                <div style="display: flex; align-items: center; gap: 15px;">
                  <div style="font-size: 12px; font-weight: 900; color: #334155; width: 140px; white-space: normal;">
                    <span style="font-size: 14px; margin-${isRtl ? 'left' : 'right'}: 6px;">${getCategoryIcon(
                  cat.name
                )}</span>
                    ${formatCategoryLabel(cat.name)}
                  </div>
                  <div style="flex: 1; height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden;">
                    <div style="width: ${percentage}%; height: 100%; background: #002b59; border-radius: 5px;"></div>
                  </div>
                  <div style="font-size: 12px; font-weight: 900; color: #1e293b; width: 50px; text-align: ${
                    isRtl ? 'left' : 'right'
                  };">${percentage}%</div>
                </div>
              `;
              })
              .join('')}
          </div>
        </div>
      `;
    }

    safeInnerHTML(
      contentWrapper,
      `
      ${headerHtml}
      ${summaryHtml}
      <h4 style="font-size: 14px; font-weight: 900; color: #1e293b; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
        <span style="width: 4px; height: 14px; background: #002b59; border-radius: 2px;"></span>
        ${t('report.txnHistory')}
      </h4>
      <div id="table-container-${pageNum}">
        <table style="width: 100%; border-collapse: separate; border-spacing: 0; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; table-layout: fixed;">
          <thead>
            <tr>
              <th style="background-color: #002b59; color: white; padding: 10px 3px; text-align: center; font-size: 8.5px; font-weight: 800; width: 13%;">📅 ${t(
                'report.hdrDate'
              )}</th>
              <th style="background-color: #002b59; color: white; padding: 10px 3px; text-align: center; font-size: 8.5px; font-weight: 800; width: 11%;">🔄 ${t(
                'report.hdrType'
              )}</th>
              <th style="background-color: #002b59; color: white; padding: 10px 3px; text-align: center; font-size: 8.5px; font-weight: 800; width: 15%;">🏷️ ${t(
                'report.hdrCategory'
              )}</th>
              <th style="background-color: #002b59; color: white; padding: 10px 3px; text-align: center; font-size: 8.5px; font-weight: 800; width: 21%;">📝 ${t(
                'report.hdrDescription'
              )}</th>
              <th style="background-color: #002b59; color: white; padding: 10px 3px; text-align: center; font-size: 8.5px; font-weight: 800; width: 12%; color: #fecaca;">📉 ${t(
                'report.totalExpense'
              )}</th>
              <th style="background-color: #002b59; color: white; padding: 10px 3px; text-align: center; font-size: 8.5px; font-weight: 800; width: 12%; color: #bbf7d0;">📈 ${t(
                'report.totalIncome'
              )}</th>
              <th style="background-color: #002b59; color: white; padding: 10px 3px; text-align: center; font-size: 8.5px; font-weight: 800; width: 16%; color: #bfdbfe;">⚖️ ${t(
                'report.hdrRunningBalance'
              )}</th>
            </tr>
          </thead>
          <tbody id="table-body-${pageNum}"></tbody>
        </table>
      </div>
    `
    );

    const tableBody = contentWrapper.querySelector(`#table-body-${pageNum}`);
    if (!tableBody) break;

    // Add transactions one by one until page is full
    let addedCount = 0;
    container.appendChild(pageDiv);

    while (currentTxnIndex < totalTxns) {
      const tx = txns[currentTxnIndex];

      // Build row and all 7 cells using direct DOM APIs
      const row = document.createElement('tr');
      row.style.backgroundColor = addedCount % 2 === 0 ? '#ffffff' : '#f8fafc';

      // 1. Date cell
      const td0 = document.createElement('td');
      td0.style.cssText =
        'width:13%;padding:10px 3px;font-size:8.5px;color:#64748b;border-bottom:1px solid #f1f5f9;text-align:center;';
      td0.textContent = new Date(tx.date || tx.createdAt || Date.now()).toLocaleDateString(locale);

      // 2. Type cell
      const td1 = document.createElement('td');
      td1.style.cssText =
        'width:11%;padding:10px 3px;font-size:8.5px;color:#64748b;border-bottom:1px solid #f1f5f9;text-align:center;';
      td1.textContent =
        (tx.type === 'income' ? '➕ ' : '➖ ') +
        (tx.type === 'income' ? t('report.incomeLabel') : t('report.expenseLabel'));

      // 3. Category cell
      const td2 = document.createElement('td');
      td2.style.cssText =
        'width:15%;padding:10px 3px;font-size:9.5px;font-weight:800;color:#1e293b;border-bottom:1px solid #f1f5f9;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      const iconSpan = document.createElement('span');
      iconSpan.style.cssText = `font-size:11px;margin-${isRtl ? 'left' : 'right'}:3px;`;
      iconSpan.textContent = getCategoryIcon(tx.category);
      td2.appendChild(iconSpan);
      td2.appendChild(document.createTextNode(formatCategoryLabel(tx.category)));

      // 4. Description cell
      const td3 = document.createElement('td');
      td3.style.cssText =
        'width:21%;padding:10px 3px;font-size:8.5px;color:#64748b;border-bottom:1px solid #f1f5f9;text-align:center;overflow:hidden;word-break:break-word;line-height:1.2;';
      td3.textContent = tx.description || '-';

      // 5. Expense cell
      const td4 = document.createElement('td');
      td4.style.cssText =
        'width:12%;padding:10px 3px;font-size:9px;font-weight:900;color:#dc2626;border-bottom:1px solid #f1f5f9;text-align:center;';
      td4.textContent = tx.type === 'expense' ? fmtRaw(tx.amount) : '-';

      // 6. Income cell
      const td5 = document.createElement('td');
      td5.style.cssText =
        'width:12%;padding:10px 3px;font-size:9px;font-weight:900;color:#16a34a;border-bottom:1px solid #f1f5f9;text-align:center;';
      td5.textContent = tx.type === 'income' ? fmtRaw(tx.amount) : '-';

      // 7. Running Balance cell
      const td6 = document.createElement('td');
      td6.style.cssText =
        'width:16%;padding:10px 3px;font-size:9.5px;font-weight:900;border-bottom:1px solid #f1f5f9;text-align:center;';
      const rbVal = tx.runningBalance || 0;
      td6.textContent = (rbVal >= 0 ? '+' : '') + fmtRaw(rbVal);
      if (rbVal < 0) {
        td6.style.color = '#dc2626';
        td6.style.backgroundColor = 'rgba(254, 242, 242, 0.6)';
      } else {
        td6.style.color = '#0f2c59';
        td6.style.backgroundColor = 'rgba(240, 247, 255, 0.6)';
      }

      [td0, td1, td2, td3, td4, td5, td6].forEach((td) => row.appendChild(td));
      tableBody.appendChild(row);

      // Check if height exceeds available space (approx 260mm)
      const currentHeight = contentWrapper.offsetHeight;
      const mmHeight = (currentHeight * 25.4) / 96;

      if (mmHeight > 245) {
        tableBody.removeChild(row);
        break;
      }

      currentTxnIndex++;
      addedCount++;
    }

    // Add footer if last page or if space allows
    if (currentTxnIndex === totalTxns) {
      const footer = document.createElement('div');
      footer.style.cssText =
        'margin-top: 25px; padding: 15px; border-top: 2px dashed #e2e8f0; text-align: center; color: #94a3b8; font-size: 10px; font-weight: 800;';
      footer.innerText = t('report.professionalFooter');
      contentWrapper.appendChild(footer);
    }

    // Wait for fonts and capture
    await new Promise((r) => setTimeout(r, 600));
    const canvas = await html2canvas(pageDiv, { scale: 2, useCORS: true, logging: false });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    if (pageNum > 1) doc.addPage();
    doc.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

    container.removeChild(pageDiv);
    pageNum++;
  }

  document.body.removeChild(container);

  if (Capacitor.isNativePlatform() && saveFileNativeFn) {
    const pdfBase64 = doc.output('datauristring').split(',')[1];
    await saveFileNativeFn(pdfBase64, fileName, 'application/pdf', true);
  } else {
    doc.save(fileName);
  }
}

export async function exportTaxPDF(
  txns: Transaction[],
  saveFileNativeFn?: SaveFileNativeFn,
  fileName = 'tax_report.pdf',
  year: number = new Date().getFullYear()
): Promise<void> {
  const locale = getIntlLocale();
  const isRtl = !isAppLTR();
  const yearTxns = txns.filter(
    (tx) => new Date(tx.date || tx.createdAt || Date.now()).getFullYear() === year
  );

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals: Record<string, { amount: number; type: string }> = {};

  yearTxns.forEach((tx) => {
    if (tx.type === 'income') totalIncome += tx.amount;
    else if (tx.type === 'expense') totalExpense += tx.amount;
    if (!categoryTotals[tx.category]) categoryTotals[tx.category] = { amount: 0, type: tx.type };
    categoryTotals[tx.category].amount += tx.amount;
  });

  const netIncome = totalIncome - totalExpense;
  const estimatedTax = netIncome > 0 ? netIncome * 0.15 : 0;

  if (document.fonts) await document.fonts.load('16px "IBM Plex Sans Arabic"');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-5000px;top:0;width:210mm;background:white;';
  document.body.appendChild(container);

  const pageDiv = document.createElement('div');
  pageDiv.dir = isRtl ? 'rtl' : 'ltr';
  pageDiv.style.cssText = `width:210mm;padding:20mm;background:white;min-height:297mm;box-sizing:border-box;font-family:'IBM Plex Sans Arabic', sans-serif;`;

  safeInnerHTML(
    pageDiv,
    `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #b91c1c; padding-bottom: 15px; margin-bottom: 30px;">
      <div style="display: flex; align-items: center; gap: 15px;">
        <img src="${APP_LOGO}" style="width: 50px; height: 50px;" />
        <div>
          <div style="font-size: 26px; font-weight: 900; color: #b91c1c; text-align: ${
            isRtl ? 'right' : 'left'
          };">${t('report.taxAnnualTitle', { year: String(year) })}</div>
          <div style="font-size: 13px; color: #64748b; margin-top: 4px; text-align: ${
            isRtl ? 'right' : 'left'
          };">Masarifi Annual Tax Report</div>
        </div>
      </div>
      <div style="text-align: ${isRtl ? 'left' : 'right'}; font-size: 11px; color: #64748b;">
        <div style="font-weight: bold; color: #002b59; margin-bottom: 4px;">${t(
          'report.issueDate'
        )}: ${new Date().toLocaleDateString(locale)}</div>
      </div>
    </div>

    <div style="display: flex; gap: 20px; margin-bottom: 30px;">
      <div style="flex: 1; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
        <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">💰 ${t(
          'report.totalIncome'
        )}</div>
        <div style="font-size: 20px; font-weight: 900; color: #16a34a;">+${fmtRaw(totalIncome)}</div>
      </div>
      <div style="flex: 1; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
        <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">💸 ${t(
          'report.totalExpense'
        )}</div>
        <div style="font-size: 20px; font-weight: 900; color: #dc2626;">-${fmtRaw(totalExpense)}</div>
      </div>
      <div style="flex: 1; padding: 20px; background: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0; text-align: center;">
        <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">⚖️ ${t(
          'report.netIncome'
        )}</div>
        <div style="font-size: 20px; font-weight: 900; color: #002b59;">${fmtRaw(netIncome)}</div>
      </div>
    </div>

    <h3 style="font-size: 18px; color: #002b59; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; text-align: ${
      isRtl ? 'right' : 'left'
    };">${t('report.spendingByCategory')}</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
      <thead>
        <tr style="background: #f1f5f9;">
          <th style="padding: 12px; text-align: ${
            isRtl ? 'right' : 'left'
          }; font-size: 13px; color: #475569; border: 1px solid #e2e8f0;">${t(
      'report.hdrCategory'
    )}</th>
          <th style="padding: 12px; text-align: ${
            isRtl ? 'right' : 'left'
          }; font-size: 13px; color: #475569; border: 1px solid #e2e8f0;">${t(
      'report.hdrType'
    )}</th>
          <th style="padding: 12px; text-align: ${
            isRtl ? 'right' : 'left'
          }; font-size: 13px; color: #475569; border: 1px solid #e2e8f0;">${t(
      'report.hdrTotal'
    )}</th>
        </tr>
      </thead>
      <tbody>
        ${Object.keys(categoryTotals)
          .map(
            (cat) => `
          <tr>
            <td style="padding: 12px; font-size: 13px; font-weight: bold; border: 1px solid #e2e8f0; text-align: ${
              isRtl ? 'right' : 'left'
            };">
              <span style="font-size: 15px; margin-${isRtl ? 'left' : 'right'}: 6px;">${getCategoryIcon(
              cat
            )}</span>
              ${formatCategoryLabel(cat)}
            </td>
            <td style="padding: 12px; font-size: 13px; color: #64748b; border: 1px solid #e2e8f0; text-align: ${
              isRtl ? 'right' : 'left'
            };">${
              categoryTotals[cat].type === 'income'
                ? '➕ ' + t('report.incomeLabel')
                : '➖ ' + t('report.expenseLabel')
            }</td>
            <td style="padding: 12px; font-size: 14px; font-weight: bold; color: ${
              categoryTotals[cat].type === 'income' ? '#16a34a' : '#dc2626'
            }; border: 1px solid #e2e8f0; text-align: ${isRtl ? 'right' : 'left'};">${fmtRaw(
              categoryTotals[cat].amount
            )}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <div style="margin-top: 20px; padding: 25px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px;">
      <h3 style="font-size: 16px; color: #b45309; margin-bottom: 10px; margin-top: 0; text-align: ${
        isRtl ? 'right' : 'left'
      };">${t('report.taxEstimateTitle')}</h3>
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #fcd34d; padding-bottom: 10px; margin-bottom: 10px;">
        <span style="font-size: 14px; color: #92400e;">${t('report.netTaxableIncome')}:</span>
        <span style="font-size: 16px; font-weight: bold; color: #92400e;">${fmtRaw(netIncome)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 14px; color: #b45309; font-weight: bold;">${t(
          'report.estimatedTaxLabel'
        )}:</span>
        <span style="font-size: 18px; font-weight: 900; color: #b91c1c;">${fmtRaw(estimatedTax)}</span>
      </div>
      <p style="font-size: 10px; color: #d97706; margin-top: 15px; text-align: center;">${t(
        'report.taxDisclaimer'
      )}</p>
    </div>
  `
  );

  container.appendChild(pageDiv);
  await new Promise((r) => setTimeout(r, 600));
  const canvas = await html2canvas(pageDiv, { scale: 2, useCORS: true, logging: false });
  container.removeChild(pageDiv);

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  doc.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  document.body.removeChild(container);

  if (Capacitor.isNativePlatform() && saveFileNativeFn) {
    const pdfBase64 = doc.output('datauristring').split(',')[1];
    await saveFileNativeFn(pdfBase64, fileName, 'application/pdf', true);
  } else {
    doc.save(fileName);
  }
}
