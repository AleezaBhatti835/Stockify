import { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import XLSX from 'xlsx-js-style';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

const TABS = [
  { key: 'purchase', label: 'Purchase List', endpoint: '/api/purchases' },
  { key: 'return', label: 'Purchase Return', endpoint: '/api/purchase-returns' },
  { key: 'rebate', label: 'Purchase Rebate', endpoint: '/api/purchase-rebates' },
  { key: 'difference', label: 'Purchase Difference', endpoint: '/api/purchase-rate-difference' },
];

function PurchaseReport() {
  const [activeTab, setActiveTab] = useState('purchase');
  const [records, setRecords] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // ================= VIEW MODE STATE (Abstract vs Detailed) =================
  const [viewMode, setViewMode] = useState('detailed'); 

  // ================= FILTER STATES =================
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // ================= PAGINATION STATES =================
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchData();
    setSelectedSupplier('');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSupplier, fromDate, toDate, viewMode]);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/suppliers`);
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const tab = TABS.find(t => t.key === activeTab);
      const res = await fetch(`${API_BASE_URL}${tab.endpoint}`);
      if (!res.ok) throw new Error('Not available');
      const data = await res.json();
      
      let list = [];
      if (Array.isArray(data)) {
        list = data;
      } else {
        list = data.purchases || data.purchaseReturns || data.items || data.rows || data.differences || data.rateDifferences || data.purchaseRateDifferences || data.data || [];
        if (list.length === 0) {
            const possibleArray = Object.values(data).find(val => Array.isArray(val));
            if (possibleArray) list = possibleArray;
        }
      }
      setRecords(list);
    } catch (err) {
      console.error(`Error fetching ${activeTab} data:`, err);
      setRecords([]);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  // ================= HELPERS =================
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  // ================= FLATTEN INTO PRODUCT-LEVEL OR SUMMARY ROWS ==================
  const flatRows = useMemo(() => {
    const getSupplierName = (r) => {
      let name = r.supplierName || r.supplier?.contactPerson || r.supplier?.companyName || r.purchase?.supplier?.contactPerson || r.purchase?.supplier?.companyName;
      if (name) return name;
      let rawId = r.supplierId || r.supplier?._id || r.supplier || r.purchase?.supplier?._id || r.purchase?.supplier;
      let sId = typeof rawId === 'object' && rawId !== null ? rawId._id : rawId;
      if (sId && typeof sId === 'string') {
        const found = suppliers.find(s => s._id === sId);
        if (found) return found.contactPerson || found.companyName;
      }
      return 'Unknown Supplier';
    };

    const getSupplierId = (r) => {
      let rawId = r.supplierId || r.supplier?._id || r.supplier || r.purchase?.supplier?._id || r.purchase?.supplier;
      return typeof rawId === 'object' && rawId !== null ? rawId._id : rawId || '';
    };

    const getDate = (r) => r.differenceDate || r.purchaseDate || r.returnDate || r.rebateDate || r.date || r.createdAt;
    const getRefNumber = (r) => r.differenceNumber || r.purchaseNumber || r.returnNumber || r.rebateNumber || r.refNumber || '—';
    const getInvoiceNumber = (r) => r.invoiceNumber || r.purchase?.invoiceNumber || r.purchase?.purchaseNumber || r.invoice?.invoiceNumber || '—';

    const rows = [];
    records.forEach(r => {
      const meta = {
        parentId: r._id,
        date: getDate(r),
        ref: getRefNumber(r),
        invoice: getInvoiceNumber(r),
        supplierName: getSupplierName(r),
        supplierId: getSupplierId(r),
      };

      let lineItems = r.items || r.details || r.products || r.purchaseItems || r.returnItems || [];
      if (!lineItems.length) {
          const possibleArr = Object.values(r).find(v => Array.isArray(v) && v.length > 0 && typeof v[0] === 'object');
          if (possibleArr) lineItems = possibleArr;
      }

      const isFlatItem = !lineItems.length && (r.product || r.productName || r.quantity !== undefined);

      // --- ABSTRACT (SUMMARY) MODE ---
      if (viewMode === 'summary') {
        let invoiceTotal = r.totalAmount ?? r.amount ?? r.differenceAmount ?? r.totalDifference ?? r.netAmount;
        
        if (invoiceTotal === undefined && lineItems.length > 0) {
           invoiceTotal = lineItems.reduce((sum, item) => sum + (item.totalDifference ?? item.totalDiff ?? item.totalPrice ?? item.lineTotal ?? ((item.quantity || 0) * (item.rate || item.unitPrice || item.newRate || 0))), 0);
        } else if (invoiceTotal === undefined && isFlatItem) {
           const qty = r.quantity ?? r.qty ?? 0;
           const rate = r.unitPrice ?? r.rate ?? r.newRate ?? 0;
           invoiceTotal = r.lineTotal ?? r.totalPrice ?? (qty * rate);
        }

        let productLabel = '—';
        let pId = null;
        let qtyLabel = '—';
        let rateLabel = '—';
        let prevRateLabel = '—';
        let newRateLabel = '—';
        let diffRateLabel = '—';

        if (lineItems.length === 1) {
           // Exactly 1 product -> Show details including rates
           const item = lineItems[0];
           productLabel = item.product?.name || item.productName || 'Unknown Product';
           pId = item.product?._id || item.product || null;
           qtyLabel = item.quantity ?? item.purchasedQuantity ?? item.qty ?? '—';
           prevRateLabel = item.prevRate ?? item.oldRate ?? 0;
           newRateLabel = item.newRate ?? item.rate ?? item.unitPrice ?? 0;
           diffRateLabel = item.difference ?? item.diffRate ?? (newRateLabel - prevRateLabel);
           rateLabel = item.unitPrice ?? item.rate ?? item.newRate ?? 0;

        } else if (lineItems.length > 1) {
           // Multiple products -> Hide details
           productLabel = '— (Multiple Products)';
        } else if (isFlatItem) {
           // Single flat item -> Show details including rates
           productLabel = typeof r.product === 'object' ? r.product?.name : (r.productName || r.product || 'Unknown Product');
           pId = typeof r.product === 'object' ? r.product?._id : (r.productId || null);
           qtyLabel = r.quantity ?? r.purchasedQuantity ?? r.qty ?? '—';
           prevRateLabel = r.prevRate ?? r.oldRate ?? 0;
           newRateLabel = r.newRate ?? r.rate ?? r.unitPrice ?? 0;
           diffRateLabel = r.difference ?? r.diffRate ?? (newRateLabel - prevRateLabel);
           rateLabel = r.unitPrice ?? r.rate ?? r.newRate ?? 0;
        }

        rows.push({
          ...meta,
          product: productLabel,
          productId: pId,
          quantity: qtyLabel,
          prevRate: prevRateLabel,
          newRate: newRateLabel,
          diffRate: diffRateLabel,
          rate: rateLabel,
          lineTotal: invoiceTotal || 0,
          isSummaryOnly: true
        });
        return;
      }

      // --- DETAILED (PRODUCT BASED) MODE ---
      if (lineItems.length > 0) {
        lineItems.forEach(item => {
          const qty = item.quantity ?? item.purchasedQuantity ?? item.purchaseQty ?? item.qty ?? '—';
          const prevRate = item.prevRate ?? item.oldRate ?? 0;
          const newRate = item.newRate ?? item.rate ?? item.unitPrice ?? 0;
          const diffRate = item.difference ?? item.diffRate ?? (newRate - prevRate);
          const rate = item.unitPrice ?? item.rate ?? item.newRate ?? 0;
          const lineTotal = item.totalDifference ?? item.totalDiff ?? item.totalPrice ?? item.lineTotal ?? ((typeof qty === 'number' && typeof rate === 'number') ? qty * rate : 0);
          
          rows.push({
            ...meta,
            product: item.product?.name || item.productName || 'Unknown Product',
            productId: item.product?._id || item.product || null,
            quantity: qty,
            prevRate,
            newRate,
            diffRate,
            rate,
            lineTotal,
            isSummaryOnly: false
          });
        });
      } else if (isFlatItem) {
          const qty = r.quantity ?? r.purchasedQuantity ?? r.purchaseQty ?? r.qty ?? '—';
          const prevRate = r.prevRate ?? r.oldRate ?? 0;
          const newRate = r.newRate ?? r.rate ?? r.unitPrice ?? 0;
          const diffRate = r.difference ?? r.diffRate ?? (newRate - prevRate);
          const rate = r.unitPrice ?? r.rate ?? r.newRate ?? 0;
          const lineTotal = r.totalAmount ?? r.amount ?? r.differenceAmount ?? r.totalDifference ?? r.totalDiff ?? r.totalPrice ?? r.lineTotal ?? ((typeof qty === 'number' && typeof rate === 'number') ? qty * rate : 0);

          rows.push({
            ...meta,
            product: typeof r.product === 'object' ? r.product?.name : (r.productName || r.product || 'Unknown Product'),
            productId: typeof r.product === 'object' ? r.product?._id : (r.productId || null),
            quantity: qty,
            prevRate,
            newRate,
            diffRate,
            rate,
            lineTotal,
            isSummaryOnly: false
          });
      }
    });
    return rows;
  }, [records, suppliers, viewMode]);

  // ================= FILTER & SORT LOGIC =================
  const filtered = useMemo(() => {
    let result = [...flatRows];

    if (selectedSupplier) {
      result = result.filter(r => r.supplierId === selectedSupplier);
    }

    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      result = result.filter(r => {
        const d = new Date(r.date);
        return d >= from && d <= to;
      });
    }

    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      if (dateA !== dateB) return dateA - dateB; 
      return (a.ref || '').toString().localeCompare((b.ref || '').toString(), undefined, { numeric: true });
    });

    return result;
  }, [flatRows, selectedSupplier, fromDate, toDate]);

  const clearFilters = () => {
    setSelectedSupplier('');
    setFromDate('');
    setToDate('');
  };

  const activeTabLabel = TABS.find(t => t.key === activeTab)?.label || '';
  const grandTotal = filtered.reduce((sum, r) => sum + (Number(r.lineTotal) || 0), 0);
  const isDiffTab = activeTab === 'difference';

  const columns = isDiffTab 
    ? ['Sr#', 'Date', 'Ref #', 'Invoice #', 'Supplier', 'Product', 'Qty', 'Prev Rate', 'New Rate', 'Diff Rate', 'Total Diff']
    : ['Sr#', 'Date', 'Ref #', 'Invoice #', 'Supplier', 'Product', 'Quantity', 'Rate', 'Line Total'];

  const getRow = (r, idx) => {
    const baseRow = [
      idx + 1,
      formatDate(r.date),
      r.ref,
      r.invoice,
      r.supplierName,
      r.product,
      r.quantity,
    ];

    if (isDiffTab) {
      return [...baseRow, 
        typeof r.prevRate === 'number' ? r.prevRate.toFixed(2) : r.prevRate,
        typeof r.newRate === 'number' ? r.newRate.toFixed(2) : r.newRate,
        typeof r.diffRate === 'number' ? r.diffRate.toFixed(2) : r.diffRate,
        typeof r.lineTotal === 'number' ? r.lineTotal.toFixed(2) : r.lineTotal
      ];
    }

    return [...baseRow, 
      typeof r.rate === 'number' ? r.rate.toFixed(2) : r.rate,
      typeof r.lineTotal === 'number' ? r.lineTotal.toFixed(2) : r.lineTotal
    ];
  };

  // ==================== PRINT ====================
  const handlePrint = () => {
    const rowsHtml = filtered.map((r, idx) => {
      let tdHtml = `
        <td style="text-align: center; width: 35px;">${idx + 1}</td>
        <td style="width: 80px;">${formatDate(r.date)}</td>
        <td style="width: 90px; font-weight: bold;">${r.ref}</td>
        <td style="width: 90px;">${r.invoice}</td>
        <td style="width: 140px;">${r.supplierName}</td>
        <td style="width: 150px;">${r.product}</td>
        <td style="width: 60px; text-align: center;">${r.quantity}</td>
      `;

      if (isDiffTab) {
        tdHtml += `
          <td style="width: 70px; text-align: right;">${typeof r.prevRate === 'number' ? r.prevRate.toFixed(2) : r.prevRate}</td>
          <td style="width: 70px; text-align: right;">${typeof r.newRate === 'number' ? r.newRate.toFixed(2) : r.newRate}</td>
          <td style="width: 70px; text-align: right; color: ${r.diffRate > 0 ? 'green' : 'red'};">${typeof r.diffRate === 'number' ? r.diffRate.toFixed(2) : r.diffRate}</td>
          <td style="width: 80px; text-align: right; color: ${r.lineTotal > 0 ? 'green' : 'red'};">${typeof r.lineTotal === 'number' ? r.lineTotal.toFixed(2) : r.lineTotal}</td>
        `;
      } else {
        tdHtml += `
          <td style="width: 80px; text-align: right;">${typeof r.rate === 'number' ? r.rate.toFixed(2) : r.rate}</td>
          <td style="width: 90px; text-align: right;">${typeof r.lineTotal === 'number' ? r.lineTotal.toFixed(2) : r.lineTotal}</td>
        `;
      }
      return `<tr>${tdHtml}</tr>`;
    }).join('');

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <html>
        <head>
          <style>
            * { box-sizing: border-box; }
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; color: #000; padding: 0; margin: 0; }
            .header-container { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; }
            h2 { margin: 0; font-size: 18px; color: #0f172a; }
            p { margin: 0; color: #64748b; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; word-wrap: break-word; }
            th { background: #f1f5f9; color: #334155; text-transform: uppercase; font-size: 10px; font-weight: 700; border-bottom: 2px solid #94a3b8; }
            tr:nth-child(even) { background-color: #f8fafc; }
            tfoot td { font-weight: bold; border-top: 2px solid #000; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <h2>${activeTabLabel} Report</h2>
              <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
            <p><strong>Total:</strong> ${filtered.length} line item(s)</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 35px; text-align:center;">Sr#</th>
                <th style="width: 80px;">Date</th>
                <th style="width: 90px;">Ref #</th>
                <th style="width: 90px;">Invoice #</th>
                <th style="width: 140px;">Supplier</th>
                <th style="width: 150px;">Product</th>
                <th style="width: 60px; text-align:center;">Qty</th>
                ${isDiffTab ? `
                  <th style="width: 70px; text-align:right;">Prev Rate</th>
                  <th style="width: 70px; text-align:right;">New Rate</th>
                  <th style="width: 70px; text-align:right;">Diff Rate</th>
                  <th style="width: 80px; text-align:right;">Total Diff</th>
                ` : `
                  <th style="width: 80px; text-align:right;">Rate</th>
                  <th style="width: 90px; text-align:right;">Line Total</th>
                `}
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot>
              <tr>
                <td colspan="${isDiffTab ? '10' : '8'}" style="text-align:right;">Grand Total</td>
                <td style="text-align:right;">${grandTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 500);
    }, 300);
  };

  // ==================== PDF EXPORT ====================
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`${activeTabLabel} Report`, 14, 12);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on ${new Date().toLocaleString()} — ${filtered.length} line item(s)`, 14, 18);

    const footArray = isDiffTab 
      ? [['', '', '', '', '', '', '', '', '', 'Grand Total', grandTotal.toFixed(2)]]
      : [['', '', '', '', '', '', '', 'Grand Total', grandTotal.toFixed(2)]];

    autoTable(doc, {
      startY: 22,
      head: [columns],
      body: filtered.map((r, idx) => getRow(r, idx)),
      foot: footArray,
      styles: { fontSize: 8, cellPadding: 4, lineColor: [203, 213, 225], lineWidth: 0.1 },
      headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: isDiffTab ? {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 20 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 40 },
        5: { cellWidth: 45 },
        6: { cellWidth: 15, halign: 'center' },
        7: { cellWidth: 20, halign: 'left' },
        8: { cellWidth: 20, halign: 'left' },
        9: { cellWidth: 20, halign: 'left' },
        10: { cellWidth: 25, halign: 'left' },
      } : {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 25 },
        2: { cellWidth: 28 },
        3: { cellWidth: 28 },
        4: { cellWidth: 45 },
        5: { cellWidth: 55 },
        6: { cellWidth: 18, halign: 'center' },
        7: { cellWidth: 25, halign: 'left' },
        8: { cellWidth: 28, halign: 'left' },
      }
    });
    doc.save(`${activeTab}-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

 // ==================== EXCEL EXPORT ====================
  const handleExportExcel = () => {
    const rows = filtered.map((r, idx) => {
      const baseObj = {
        'Sr#': idx + 1,
        'Date': formatDate(r.date),
        'Ref #': r.ref,
        'Invoice #': r.invoice,
        'Supplier': r.supplierName,
        'Product': r.product,
        'Qty': r.quantity,
      };

      if (isDiffTab) {
        return {
          ...baseObj,
          'Prev Rate': typeof r.prevRate === 'number' ? r.prevRate.toFixed(2) : r.prevRate,
          'New Rate': typeof r.newRate === 'number' ? r.newRate.toFixed(2) : r.newRate,
          'Diff Rate': typeof r.diffRate === 'number' ? r.diffRate.toFixed(2) : r.diffRate,
          'Total Diff': typeof r.lineTotal === 'number' ? r.lineTotal.toFixed(2) : r.lineTotal,
        };
      }

      return {
        ...baseObj,
        'Rate': typeof r.rate === 'number' ? r.rate.toFixed(2) : r.rate,
        'Line Total': typeof r.lineTotal === 'number' ? r.lineTotal.toFixed(2) : r.lineTotal,
      };
    });

    if (isDiffTab) {
      rows.push({ 'Sr#': '', 'Date': '', 'Ref #': '', 'Invoice #': '', 'Supplier': '', 'Product': '', 'Qty': '', 'Prev Rate': '', 'New Rate': '', 'Diff Rate': 'Grand Total', 'Total Diff': grandTotal.toFixed(2) });
    } else {
      rows.push({ 'Sr#': '', 'Date': '', 'Ref #': '', 'Invoice #': '', 'Supplier': '', 'Product': '', 'Qty': '', 'Rate': 'Grand Total', 'Line Total': grandTotal.toFixed(2) });
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    
    // Force Left Alignment directly on cells via XLSX Styles
    Object.keys(worksheet).forEach((key) => {
      if (key !== '!ref' && key !== '!cols') {
        if (!worksheet[key].s) worksheet[key].s = {};
        worksheet[key].s.alignment = { horizontal: "left" };
      }
    });

    // Set Column Widths
    if (isDiffTab) {
      worksheet['!cols'] = [
        { wch: 6 },   // Sr#
        { wch: 14 },  // Date
        { wch: 14 },  // Ref #
        { wch: 14 },  // Invoice #
        { wch: 25 },  // Supplier
        { wch: 20 },  // Product
        { wch: 10 },  // Qty
        { wch: 12 },  // Prev Rate
        { wch: 12 },  // New Rate
        { wch: 18 },  // Diff Rate
        { wch: 16 }   // Total Diff
      ];
    } else {
      worksheet['!cols'] = [
        { wch: 6 },   // Sr#
        { wch: 14 },  // Date
        { wch: 14 },  // Ref #
        { wch: 14 },  // Invoice #
        { wch: 25 },  // Supplier
        { wch: 20 },  // Product
        { wch: 10 },  // Qty
        { wch: 18 },  // Rate
        { wch: 16 }   // Line Total
      ];
    }
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTabLabel);
    XLSX.writeFile(workbook, `${activeTab}-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ================= PAGINATION LOGIC =================
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRows = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div style={styles.tabContainer}>
          {TABS.map(t => (
            <button
              key={t.key}
              style={activeTab === t.key ? styles.activeTab : styles.tab}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}

          <button style={{ ...styles.actionBtn, backgroundColor: '#409fb0', marginLeft: 'auto' }} onClick={handlePrint}><FontAwesomeIcon icon={faPrint} /> Print</button>
          <button style={{ ...styles.actionBtn, backgroundColor: '#d66336' }} onClick={handleExportPDF}><FontAwesomeIcon icon={faFilePdf} /> PDF</button>
          <button style={{ ...styles.actionBtn, backgroundColor: '#296f3f' }} onClick={handleExportExcel}><FontAwesomeIcon icon={faFileExcel} /> Excel</button>
        </div>
      </div>

      {/* ==================== FILTERS & VIEW MODE ==================== */}
      <div style={styles.filterRow}>
        
        {/* VIEW MODE INTEGRATED IN FILTER ROW */}
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>View Mode</label>
          <div style={styles.radioToggleWrapper}>
            <label style={styles.radioLabel}>
              <input 
                type="radio" 
                name="viewMode" 
                value="summary" 
                checked={viewMode === 'summary'} 
                onChange={(e) => setViewMode(e.target.value)} 
              />
              Abstract
            </label>
            <label style={styles.radioLabel}>
              <input 
                type="radio" 
                name="viewMode" 
                value="detailed" 
                checked={viewMode === 'detailed'} 
                onChange={(e) => setViewMode(e.target.value)} 
              />
              Detailed
            </label>
          </div>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Supplier</label>
          <select
            style={styles.filterInput}
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
          >
            <option value="">All Suppliers</option>
            {suppliers.map(s => (
              <option key={s._id} value={s._id}>{s.contactPerson || s.companyName}</option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>From Date</label>
          <input type="date" style={styles.filterInput} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>To Date</label>
          <input type="date" style={styles.filterInput} value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>

        <button style={styles.clearFilterBtn} onClick={clearFilters}>
          Clear Filters
        </button>
      </div>

      <div style={styles.filterStats}>
        Showing {filtered.length} {viewMode === 'summary' ? 'transaction(s)' : 'line item(s)'}
      </div>

      {/* ==================== TABLE ==================== */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '4%', textAlign: 'center' }}>Sr#</th>
              <th style={{ ...styles.th, width: '8%' }}>Date</th>
              <th style={{ ...styles.th, width: '9%' }}>Ref #</th>
              <th style={{ ...styles.th, width: '9%' }}>Invoice #</th>
              <th style={{ ...styles.th, width: '13%' }}>Supplier</th>
              <th style={{ ...styles.th, width: '14%' }}>Product</th>
              <th style={{ ...styles.th, width: '5%', textAlign: 'center' }}>Qty</th>
              {isDiffTab ? (
                <>
                  <th style={{ ...styles.th, width: '9%', textAlign: 'left' }}>Prev Rate</th>
                  <th style={{ ...styles.th, width: '9%', textAlign: 'left' }}>New Rate</th>
                  <th style={{ ...styles.th, width: '9%', textAlign: 'left' }}>Diff Rate</th>
                  <th style={{ ...styles.th, width: '11%', textAlign: 'left' }}>Total Diff</th>
                </>
              ) : (
                <>
                  <th style={{ ...styles.th, width: '10%', textAlign: 'left' }}>Rate</th>
                  <th style={{ ...styles.th, width: '12%', textAlign: 'left' }}>Line Total</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isDiffTab ? 11 : 9} style={styles.emptyCell}>Loading...</td></tr>
            ) : fetchError ? (
              <tr><td colSpan={isDiffTab ? 11 : 9} style={styles.emptyCell}>
                This report isn't available yet — check the "{activeTabLabel}" endpoint on the backend.
              </td></tr>
            ) : currentRows.length === 0 ? (
              <tr><td colSpan={isDiffTab ? 11 : 9} style={styles.emptyCell}>No records found matching your filters.</td></tr>
            ) : (
              currentRows.map((r, idx) => {
                const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                return (
                  <tr key={`${r.parentId}-${idx}`} style={idx % 2 === 1 ? styles.altRow : null}>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{serialNumber}</td>
                    <td style={styles.td}>{formatDate(r.date)}</td>
                    <td style={{ ...styles.td, fontWeight: 700, color: '#0f172a' }}>{r.ref}</td>
                    <td style={styles.td}>{r.invoice}</td>
                    <td style={styles.td}>{r.supplierName}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{r.product}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{r.quantity}</td>
                    {isDiffTab ? (
                      <>
                        <td style={{ ...styles.td, textAlign: 'left' }}>{typeof r.prevRate === 'number' ? r.prevRate.toFixed(2) : r.prevRate}</td>
                        <td style={{ ...styles.td, textAlign: 'left' }}>{typeof r.newRate === 'number' ? r.newRate.toFixed(2) : r.newRate}</td>
                        <td style={{ ...styles.td, textAlign: 'left', fontWeight: 600, color: r.diffRate > 0 ? '#10b981' : '#ef4444' }}>
                          {typeof r.diffRate === 'number' ? r.diffRate.toFixed(2) : r.diffRate}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'left', fontWeight: 700, color: r.lineTotal > 0 ? '#10b981' : '#ef4444' }}>
                          {typeof r.lineTotal === 'number' ? r.lineTotal.toFixed(2) : r.lineTotal}
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ ...styles.td, textAlign: 'left' }}>{typeof r.rate === 'number' ? r.rate.toFixed(2) : r.rate}</td>
                        <td style={{ ...styles.td, textAlign: 'left', fontWeight: 600, color: '#10b981' }}>
                          {typeof r.lineTotal === 'number' ? r.lineTotal.toFixed(2) : r.lineTotal}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
          
          {/* ==================== UI GRAND TOTAL ROW ==================== */}
          {currentRows.length > 0 && (
            <tfoot>
              <tr>
                <td 
                  colSpan={isDiffTab ? 10 : 8} 
                  style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold', borderTop: '2px solid #cbd5e1', fontSize: '14px' }}
                >
                  Grand Total:
                </td>
                <td 
                  style={{ ...styles.td, textAlign: 'left', fontWeight: 'bold', borderTop: '2px solid #cbd5e1', color: '#0f172a', fontSize: '14px' }}
                >
                  {grandTotal.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ==================== PAGINATION CONTROLS ==================== */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', paddingBottom: '20px' }}>
        <button
          disabled={currentPage <= 1}
          onClick={() => setCurrentPage(prev => prev - 1)}
          style={{
            padding: '8px 16px',
            backgroundColor: currentPage <= 1 ? '#e9ecef' : '#5aa7ef',
            color: currentPage <= 1 ? '#6c757d' : 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            fontWeight: '600'
          }}
        >
          ←
        </button>
        <span style={{ fontSize: '12px', fontWeight: '400', color: '#868484' }}>
          Page {currentPage} of {totalPages || 1}
        </span>
        <button
          disabled={currentPage >= totalPages || totalPages === 0}
          onClick={() => setCurrentPage(prev => prev + 1)}
          style={{
            padding: '8px 16px',
            backgroundColor: (currentPage >= totalPages || totalPages === 0) ? '#e9ecef' : '#5aa7ef',
            color: (currentPage >= totalPages || totalPages === 0) ? '#6c757d' : 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (currentPage >= totalPages || totalPages === 0) ? 'not-allowed' : 'pointer',
            fontWeight: '600'
          }}
        >
          →
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '10px 17px', background: '#f8fafc', minHeight: '100%', marginBottom: '60px' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' },
  actionBtn: { color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },

  tabContainer: { display: 'flex', gap: '10px', marginTop: '15px', marginBottom: '15px', flexWrap: 'wrap', width: '100%', alignItems: 'center' },
  tab: { padding: '10px 18px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s ease-in-out' },
  activeTab: { padding: '10px 18px', borderRadius: '6px', border: '1px solid #3c4e6b', backgroundColor: '#3c4e6b', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s ease-in-out' },

  filterRow: { display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' },
  filterGroup: { display: 'flex', flexDirection: 'column', flex: '1', minWidth: '150px' },
  filterLabel: { fontSize: '11px', fontWeight: 500, color: '#475569', textAlign: 'left' },
  filterInput: { color: '#343a42', padding: '6.4px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' },
  clearFilterBtn: { padding: '10px 18px', background: '#6c757d', color: '#f9f9f9', border: '1px solid #cfcece', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' },
  filterStats: { marginTop: '10px', fontSize: '13px', color: '#64748b', textAlign: 'right', fontWeight: 400 },

  radioToggleWrapper: { display: 'flex', gap: '12px', alignItems: 'center', padding: '3px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#fff', height: '100%', boxSizing: 'border-box' },
  radioLabel: { fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#475569', fontWeight: 500 },

  tableWrapper: { marginTop: '6px', background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', width: '100%' },
  table: { width: '100%', minWidth: '900px', borderCollapse: 'collapse', tableLayout: 'auto' },
  th: { textAlign: 'left', padding: '12px 10px', background: '#3c4e6b', fontSize: '11px', color: '#fefefe', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #94a3b8', borderRight: '1px solid #44576e', whiteSpace: 'nowrap' },
  td: { padding: '10px 10px', textAlign: 'left', fontSize: '13px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', color: '#334155', whiteSpace: 'nowrap' },
  altRow: { backgroundColor: '#f8fafc' },
  emptyCell: { textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '14px' },
};

export default PurchaseReport;