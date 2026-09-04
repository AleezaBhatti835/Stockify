import { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
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

  const [viewMode, setViewMode] = useState('detailed');

  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

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
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/suppliers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  // CORE ARCHITECTURE: Unified multi-endpoint data aggregation engine dynamically routing and flattening nested purchase records based on active tab selection.
  const fetchData = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const token = localStorage.getItem('token');
      const tab = TABS.find(t => t.key === activeTab);
      const res = await fetch(`${API_BASE_URL}${tab.endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

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
          const item = lineItems[0];
          productLabel = item.product?.name || item.productName || 'Unknown Product';
          pId = item.product?._id || item.product || null;
          qtyLabel = item.quantity ?? item.purchasedQuantity ?? item.qty ?? '—';
          prevRateLabel = item.prevRate ?? item.oldRate ?? 0;
          newRateLabel = item.newRate ?? item.rate ?? item.unitPrice ?? 0;
          diffRateLabel = item.difference ?? item.diffRate ?? (newRateLabel - prevRateLabel);
          rateLabel = item.unitPrice ?? item.rate ?? item.newRate ?? 0;

        } else if (lineItems.length > 1) {
          productLabel = '— (Multiple Products)';
        } else if (isFlatItem) {
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

  // DATA EXPORT ENGINE: Multi-format generation algorithms deploying dynamic iframe CSS injection and structured XLSX workbook serialization based on active tabular states.
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

    Object.keys(worksheet).forEach((key) => {
      if (key !== '!ref' && key !== '!cols') {
        if (!worksheet[key].s) worksheet[key].s = {};
        worksheet[key].s.alignment = { horizontal: "left" };
      }
    });

    if (isDiffTab) {
      worksheet['!cols'] = [
        { wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 25 },
        { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 16 }
      ];
    } else {
      worksheet['!cols'] = [
        { wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 25 },
        { wch: 20 }, { wch: 10 }, { wch: 18 }, { wch: 16 }
      ];
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTabLabel);
    XLSX.writeFile(workbook, `${activeTab}-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRows = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div className="dashboard-wrapper">

      {/* TABS & EXPORTS TOP BAR */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`btn ${activeTab === t.key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handlePrint} disabled={loading || filtered.length === 0}><FontAwesomeIcon icon={faPrint} /> Print</button>
          <button className="btn btn-secondary" onClick={handleExportPDF} disabled={loading || filtered.length === 0}><FontAwesomeIcon icon={faFilePdf} /> PDF</button>
          <button className="btn btn-secondary" onClick={handleExportExcel} disabled={loading || filtered.length === 0}><FontAwesomeIcon icon={faFileExcel} /> Excel</button>
        </div>
      </div>

      {/* FILTER BAR & VIEW MODE */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">View Mode</label>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '5px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)' }}>
            <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-main)', fontWeight: 600 }}>
              <input
                type="radio"
                name="viewMode"
                value="summary"
                checked={viewMode === 'summary'}
                onChange={(e) => setViewMode(e.target.value)}
                style={{
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  margin: 0,
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'summary' ? 'var(--primary)' : '#fff',
                  border: viewMode === 'summary' ? '2px solid #fff' : '1px solid #ccc',
                  boxShadow: viewMode === 'summary' ? '0 0 0 1px var(--primary)' : 'none'
                }}
              />
              Abstract
            </label>

            <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-main)', fontWeight: 600 }}>
              <input
                type="radio"
                name="viewMode"
                value="detailed"
                checked={viewMode === 'detailed'}
                onChange={(e) => setViewMode(e.target.value)}
                style={{
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  margin: 0,
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'detailed' ? 'var(--primary)' : '#fff',
                  border: viewMode === 'detailed' ? '2px solid #fff' : '1px solid #ccc',
                  boxShadow: viewMode === 'detailed' ? '0 0 0 1px var(--primary)' : 'none'
                }}
              />
              Detailed
            </label>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
          <label className="form-label">Supplier</label>
          <select className="form-input" value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)}>
            <option value="">All Suppliers</option>
            {suppliers.map(s => (
              <option key={s._id} value={s._id}>{s.contactPerson || s.companyName}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
          <label className="form-label">From Date</label>
          <input type="date" className="form-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>

        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
          <label className="form-label">To Date</label>
          <input type="date" className="form-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>

        <button className="btn btn-secondary" onClick={clearFilters}>Clear Filters</button>
      </div>

      {/* DATA TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>


        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--header)' }}>
                {columns.map((c, i) => (
                  <th key={i} style={{ padding: '12px 16px', color: 'white', textAlign: i === 0 ? 'center' : 'left', fontSize: '13px', fontWeight: '600' }}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>Loading data...</td></tr>
              ) : fetchError ? (
                <tr><td colSpan={columns.length} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>This report isn't available yet — check the "{activeTabLabel}" endpoint on the backend.</td></tr>
              ) : currentRows.length === 0 ? (
                <tr><td colSpan={columns.length} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No records found matching your filters.</td></tr>
              ) : (
                currentRows.map((r, idx) => {
                  const serialNumber = indexOfFirstItem + idx + 1;
                  const row = getRow(r, idx);
                  row[0] = serialNumber;

                  return (
                    <tr
                      key={`${r.parentId}-${idx}`}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {row.map((cell, colIdx) => (
                        <td
                          key={colIdx}
                          style={{
                            padding: '10px 16px',
                            fontSize: '13px',
                            color: 'var(--text-main)',
                            fontWeight: colIdx === 2 || (colIdx === row.length - 1) ? '600' : '400',
                            textAlign: colIdx === 0 ? 'center' : 'left'
                          }}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>

            {currentRows.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: 'var(--bg-app)', borderTop: '2px solid var(--border-color)' }}>
                  <td colSpan={isDiffTab ? 10 : 8} style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', textAlign: 'right' }}>
                    Grand Total:
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '700', color: 'var(--danger)', textAlign: 'left' }}>
                    {grandTotal.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* PAGINATION */}
        {filtered.length > itemsPerPage && (
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
            <button className="btn btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} style={{ padding: '6px 12px' }}>
              ←
            </button>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Page {currentPage} of {totalPages || 1}</span>
            <button className="btn btn-secondary" disabled={currentPage >= totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} style={{ padding: '6px 12px' }}>
              →
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

export default PurchaseReport;