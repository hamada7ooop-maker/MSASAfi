/**
 * Directive 19 — deferred decomposition: the assets page print sheet.
 *
 * Lifted verbatim from the inline <style> block — every escaped colon
 * (md\:block etc.) is a Tailwind variant selector that must reach the
 * browser as a literal backslash. Scoped to #assets-print-container so the
 * @media print rules force the desktop grid layout onto the paper version.
 */
export const ASSETS_PRINT_CSS = `
      @media print {
        body::before, body::after, html::before, html::after {
          display: none !important;
          content: none !important;
        }
        body {
          background: white !important;
          color: black !important;
        }
        header, footer, nav, .bottom-nav, .no-print,
        .masarifi-toast, .ptr-indicator, .floating-actions-container {
          display: none !important;
        }
        #react-root, #react-root > div, #app, .flex.flex-col.h-screen,
        #main-content, #main-content > div, #main-content > div > div {
          height: auto !important;
          min-height: 100% !important;
          overflow: visible !important;
          display: block !important;
          position: static !important;
          background: white !important;
          padding: 0 !important;
          margin: 0 !important;
          max-width: 100% !important;
          width: 100% !important;
          box-shadow: none !important;
          border: none !important;
        }
        #react-root > div > *:not(#main-content) {
          display: none !important;
        }
        #main-content > div > div > *:not(#assets-print-container) {
          display: none !important;
        }
        #assets-print-container {
          position: relative !important;
          left: 0 !important;
          top: 0 !important;
          width: 1200px !important;
          max-width: 1200px !important;
          min-width: 1200px !important;
          height: auto !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          background: white !important;
          color: #1a1a1a !important;
          padding: 10px !important;
          margin: 0 !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          overflow: visible !important;
          display: block !important;
        }

        /* إظهار جميع العناصر المخفية وتوزيع الشبكات كنسخة سطح المكتب */
        #assets-print-container .hidden.md\:block,
        #assets-print-container .md\:block {
          display: block !important;
        }
        #assets-print-container .hidden.md\:flex,
        #assets-print-container .md\:flex {
          display: flex !important;
        }
        #assets-print-container .hidden.md\:inline,
        #assets-print-container .md\:inline {
          display: inline !important;
        }
        #assets-print-container .hidden.md\:table-cell,
        #assets-print-container .md\:table-cell {
          display: table-cell !important;
        }
        #assets-print-container .hidden.md\:grid,
        #assets-print-container .md\:grid {
          display: grid !important;
        }

        #assets-print-container .flex-col.md\:flex-row {
          flex-direction: row !important;
        }
        #assets-print-container .grid-cols-1.md\:grid-cols-2 {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
        #assets-print-container .grid-cols-1.md\:grid-cols-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }
        #assets-print-container .grid-cols-1.md\:grid-cols-4 {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        }
        #assets-print-container .grid-cols-1.sm\:grid-cols-2.md\:grid-cols-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }
        #assets-print-container .grid-cols-2.md\:grid-cols-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }
        #assets-print-container .md\:p-8 {
          padding: 2rem !important;
        }
        #assets-print-container .md\:gap-6 {
          gap: 1.5rem !important;
        }
        #assets-print-container * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        [style*="background-color"] {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `;
