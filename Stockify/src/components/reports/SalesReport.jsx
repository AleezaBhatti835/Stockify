import { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import XLSX from 'xlsx-js-style';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

const TABS = [
  { key: 'sale', label: 'Invoice List', endpoint: '/api/sales' },
  { key: 'return', label: 'Sale Return', endpoint: '/api/sale-returns' },
  { key: 'rebate', label: 'Sales Rebate', endpoint: '/api/sales-rebates' },
  { key: 'difference', label: 'Sales Rate Difference', endpoint: '/api/sale-rate-difference' },
];

function SalesReport() {
  const [activeTab, setActiveTab] = useState('sale');
  const [records, setRecords] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // ================= VIEW MODE STATE (Abstract vs Detailed) =================
  const [viewMode, setViewMode] = useState('detailed');

  // ================= FILTER STATES =================
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // ================= PAGINATION STATES =================
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchData();
    setSelectedCustomer('');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCustomer, fromDate, toDate, viewMode]);

  // ================= FETCH CUSTOMERS (WITH TOKEN) =================
  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/customers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  // ================= FETCH DATA (WITH TOKEN) =================
  const fetchData = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const token = localStorage.getItem('token');
      const tab = TABS.find(t => t.key === activeTab);
      const res = await fetch(`${API_BASE_URL}${tab.endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Not available');

      const data = await res.json();

      let list = [];
      if (Array.isArray(data)) {
        list = data;
      } else {
        list = data.sales || data.saleReturns || data.rows || data.differences || data.rateDifferences || data.saleRateDifferences || data.data || [];
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
    const getCustomerName = (r) => {
      let name = r.customerName || r.customer?.name || r.customer?.customerName || r.sale?.customer?.name;
      if (name) return name;

      let rawId = r.customerId || r.customer?._id || r.customer || r.sale?.customer?._id || r.sale?.customer;
      let cId = typeof rawId === 'object' && rawId !== null ? rawId._id : rawId;

      if (cId && typeof cId === 'string') {
        const foundCustomer = customers.find(c => c._id === cId);
        if (foundCustomer) return foundCustomer.name || foundCustomer.customerName;
      }
      return 'Walk-in Customer';
    };

    const getCustomerId = (r) => {
      let rawId = r.customerId || r.customer?._id || r.customer || r.sale?.customer?._id || r.sale?.customer;
      return typeof rawId === 'object' && rawId !== null ? rawId._id : rawId || '';
    };

    const getDate = (r) => r.differenceDate || r.saleDate || r.returnDate || r.rebateDate || r.date || r.createdAt;
    const getRefNumber = (r) => r.differenceNumber || r.saleNumber || r.returnNumber || r.rebateNumber || r.refNumber || '—';
    const getInvoiceNumber = (r) => r.invoiceNumber || r.sale?.invoiceNumber || r.sale?.saleNumber || r.invoice?.invoiceNumber || r.saleNumber || '—';

    const rows = [];
    records.forEach(r => {
      const meta = {
        parentId: r._id,
        date: getDate(r),
        ref: getRefNumber(r),
        invoice: getInvoiceNumber(r),
        customerName: getCustomerName(r),
        customerId: getCustomerId(r),
      };

      let lineItems = r.items || r.details || r.products || r.saleItems || r.returnItems || [];
      if (!lineItems.length) {
        const possibleArr = Object.values(r).find(v => Array.isArray(v) && v.length > 0 && typeof v[0] === 'object');
        if (possibleArr) lineItems = possibleArr;
      }

      const isFlatItem = !lineItems.length && (r.product || r.productName || r.quantity !== undefined || r.soldQuantity !== undefined);

      // --- ABSTRACT (SUMMARY) MODE ---
      if (viewMode === 'summary') {
        let invoiceTotal = r.totalAmount ?? r.amount ?? r.differenceAmount ?? r.totalDifference ?? r.netAmount;

        if (invoiceTotal === undefined && lineItems.length > 0) {
          invoiceTotal = lineItems.reduce((sum, item) => sum + (item.totalDifference ?? item.totalPrice ?? item.lineTotal ?? ((item.quantity ?? item.soldQuantity ?? item.saleQty ?? 0) * (item.rate ?? item.unitPrice ?? item.newRate ?? 0))), 0);
        } else if (invoiceTotal === undefined && isFlatItem) {
          const qty = r.quantity ?? r.soldQuantity ?? r.saleQty ?? r.qty ?? 0;
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
          qtyLabel = item.quantity ?? item.soldQuantity ?? item.saleQty ?? item.qty ?? '—';
          prevRateLabel = item.prevRate ?? item.oldRate ?? 0;
          newRateLabel = item.newRate ?? item.rate ?? item.unitPrice ?? 0;
          diffRateLabel = item.difference ?? item.diffRate ?? (newRateLabel - prevRateLabel);
          rateLabel = item.unitPrice ?? item.rate ?? item.newRate ?? 0;
        } else if (lineItems.length > 1) {
          productLabel = '— (Multiple Products)';
        } else if (isFlatItem) {
          productLabel = typeof r.product === 'object' ? r.product?.name : (r.productName || r.product || 'Unknown Product');
          pId = typeof r.product === 'object' ? r.product?._id : (r.productId || null);
          qtyLabel = r.quantity ?? r.soldQuantity ?? r.saleQty ?? r.qty ?? '—';
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
          const qty = item.quantity ?? item.soldQuantity ?? item.saleQty ?? item.qty ?? '—';
          const prevRate = item.prevRate ?? item.oldRate ?? 0;
          const newRate = item.newRate ?? item.rate ?? item.unitPrice ?? 0;
          const diffRate = item.difference ?? item.diffRate ?? (newRate - prevRate);
          const rate = item.unitPrice ?? item.rate ?? item.newRate ?? 0;
          const lineTotal = item.totalDifference ?? item.totalPrice ?? item.lineTotal ?? ((typeof qty === 'number' && typeof rate === 'number') ? qty * rate : 0);

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
        const qty = r.quantity ?? r.soldQuantity ?? r.saleQty ?? r.qty ?? '—';
        const prevRate = r.prevRate ?? r.oldRate ?? 0;
        const newRate = r.newRate ?? r.rate ?? r.unitPrice ?? 0;
        const diffRate = r.difference ?? r.diffRate ?? (newRate - prevRate);
        const rate = r.unitPrice ?? r.rate ?? r.newRate ?? 0;
        const lineTotal = r.totalAmount ?? r.amount ?? r.differenceAmount ?? r.totalDifference ?? r.totalPrice ?? r.lineTotal ?? ((typeof qty === 'number' && typeof rate === 'number') ? qty * rate : 0);

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
  }, [records, customers, viewMode]);

  // ================= FILTER & SORT LOGIC =================
  const filtered = useMemo(() => {
    let result = [...flatRows];

    if (selectedCustomer) {
      result = result.filter(r => r.customerId === selectedCustomer);
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
  }, [flatRows, selectedCustomer, fromDate, toDate]);

  const clearFilters = () => {
    setSelectedCustomer('');
    setFromDate('');
    setToDate('');
  };

  const activeTabLabel = TABS.find(t => t.key === activeTab)?.label || '';
  const grandTotal = filtered.reduce((sum, r) => sum + (Number(r.lineTotal) || 0), 0);

  const isDiffTab = activeTab === 'difference';

  const columns = isDiffTab
    ? ['Sr#', 'Date', 'Ref #', 'Invoice #', 'Customer', 'Product', 'Qty', 'Prev Rate', 'New Rate', 'Diff Rate', 'Total Diff']
    : ['Sr#', 'Date', 'Ref #', 'Invoice #', 'Customer', 'Product', 'Quantity', 'Rate', 'Line Total'];

  const getRow = (r, idx) => {
    const baseRow = [
      idx + 1,
      formatDate(r.date),
      r.ref,
      r.invoice,
      r.customerName,
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
        <td style="width: 140px;">${r.customerName}</td>
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
            th { background: #0c514b; color: #ffffff; text-transform: uppercase; font-size: 10px; font-weight: 700; border-bottom: 2px solid #94a3b8; }
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
                <th style="width: 140px;">Customer</th>
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
      headStyles: { fillColor: [12, 81, 75], textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillColor: [204, 251, 241], textColor: [12, 81, 75], fontStyle: 'bold' },
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
        'Sr#': (idx + 1).toString(),
        'Date': formatDate(r.date),
        'Ref #': r.ref,
        'Invoice #': r.invoice,
        'Customer': r.customerName,
        'Product': r.product,
        'Qty': r.quantity.toString(),
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
      rows.push({ 'Sr#': '', 'Date': '', 'Ref #': '', 'Invoice #': '', 'Customer': '', 'Product': '', 'Qty': '', 'Prev Rate': '', 'New Rate': '', 'Diff Rate': 'Grand Total', 'Total Diff': grandTotal.toFixed(2) });
    } else {
      rows.push({ 'Sr#': '', 'Date': '', 'Ref #': '', 'Invoice #': '', 'Customer': '', 'Product': '', 'Qty': '', 'Rate': 'Grand Total', 'Line Total': grandTotal.toFixed(2) });
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
        { wch: 6 },   // Sr#
        { wch: 14 },  // Date
        { wch: 14 },  // Ref #
        { wch: 14 },  // Invoice #
        { wch: 20 },  // Customer
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
        { wch: 20 },  // Customer
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
    <div className="dashboard-wrapper">

      {/* HEADER TABS & ACTIONS */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>

        {/* TABS */}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={activeTab === t.key ? "btn btn-primary" : "btn btn-secondary"}
              style={{ borderRadius: '3px', padding: '10px 20px' }}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* EXPORT ACTIONS */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handlePrint} disabled={loading || filtered.length === 0}><FontAwesomeIcon icon={faPrint} /> Print</button>
          <button className="btn btn-secondary" onClick={handleExportPDF} disabled={loading || filtered.length === 0}><FontAwesomeIcon icon={faFilePdf} /> PDF</button>
          <button className="btn btn-secondary" onClick={handleExportExcel} disabled={loading || filtered.length === 0}><FontAwesomeIcon icon={faFileExcel} /> Excel</button>
        </div>
      </div>

      {/* ==================== FILTERS & VIEW MODE ==================== */}
      <div className="card" style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-end', flexWrap: 'wrap' }}>

        {/* VIEW MODE RADIO */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">View Mode</label>
          <div style={{
            display: 'flex', gap: 'var(--space-md)', alignItems: 'center',
            padding: '4px 12px', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)',
            height: '40px', boxSizing: 'border-box'
          }}>
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
          <label className="form-label">Customer</label>
          <select
            className="form-input"
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
          >
            <option value="">All Customers</option>
            {customers.map(c => (
              <option key={c._id} value={c._id}>{c.name || c.customerName}</option>
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

        {(selectedCustomer || fromDate || toDate) && (
          <button className="btn btn-secondary" onClick={clearFilters}>
            Clear Filters
          </button>
        )}
      </div>

      {/* ==================== TABLE SECTION ==================== */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr>
                <th style={{ ...tableStyles.th, width: '4%', textAlign: 'center' }}>Sr#</th>
                <th style={{ ...tableStyles.th, width: '8%' }}>Date</th>
                <th style={{ ...tableStyles.th, width: '9%' }}>Ref #</th>
                <th style={{ ...tableStyles.th, width: '9%' }}>Invoice #</th>
                <th style={{ ...tableStyles.th, width: '13%' }}>Customer</th>
                <th style={{ ...tableStyles.th, width: '14%' }}>Product</th>
                <th style={{ ...tableStyles.th, width: '5%', textAlign: 'center' }}>Qty</th>
                {isDiffTab ? (
                  <>
                    <th style={{ ...tableStyles.th, width: '9%', textAlign: 'left' }}>Prev Rate</th>
                    <th style={{ ...tableStyles.th, width: '9%', textAlign: 'left' }}>New Rate</th>
                    <th style={{ ...tableStyles.th, width: '9%', textAlign: 'left' }}>Diff Rate</th>
                    <th style={{ ...tableStyles.th, width: '11%', textAlign: 'left' }}>Total Diff</th>
                  </>
                ) : (
                  <>
                    <th style={{ ...tableStyles.th, width: '10%', textAlign: 'left' }}>Rate</th>
                    <th style={{ ...tableStyles.th, width: '12%', textAlign: 'left' }}>Line Total</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={isDiffTab ? 11 : 9} style={tableStyles.emptyCell}>Loading...</td></tr>
              ) : fetchError ? (
                <tr><td colSpan={isDiffTab ? 11 : 9} style={tableStyles.emptyCell}>
                  This report isn't available yet — check the "{activeTabLabel}" endpoint on the backend.
                </td></tr>
              ) : currentRows.length === 0 ? (
                <tr><td colSpan={isDiffTab ? 11 : 9} style={tableStyles.emptyCell}>No records found matching your filters.</td></tr>
              ) : (
                currentRows.map((r, idx) => {
                  const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr
                      key={`${r.parentId}-${idx}`}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ ...tableStyles.td, textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>{serialNumber}</td>
                      <td style={tableStyles.td}>{formatDate(r.date)}</td>
                      <td style={{ ...tableStyles.td, fontWeight: 700, color: 'var(--text-main)' }}>{r.ref}</td>
                      <td style={tableStyles.td}>{r.invoice}</td>
                      <td style={tableStyles.td}>{r.customerName}</td>
                      <td style={{ ...tableStyles.td, fontWeight: 600 }}>{r.product}</td>
                      <td style={{ ...tableStyles.td, textAlign: 'center' }}>{r.quantity}</td>
                      {isDiffTab ? (
                        <>
                          <td style={{ ...tableStyles.td, textAlign: 'left' }}>{typeof r.prevRate === 'number' ? r.prevRate.toFixed(2) : r.prevRate}</td>
                          <td style={{ ...tableStyles.td, textAlign: 'left' }}>{typeof r.newRate === 'number' ? r.newRate.toFixed(2) : r.newRate}</td>
                          <td style={{ ...tableStyles.td, textAlign: 'left', fontWeight: 600, color: r.diffRate > 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {typeof r.diffRate === 'number' ? r.diffRate.toFixed(2) : r.diffRate}
                          </td>
                          <td style={{ ...tableStyles.td, textAlign: 'left', fontWeight: 700, color: r.lineTotal > 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {typeof r.lineTotal === 'number' ? r.lineTotal.toFixed(2) : r.lineTotal}
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ ...tableStyles.td, textAlign: 'left' }}>{typeof r.rate === 'number' ? r.rate.toFixed(2) : r.rate}</td>
                          <td style={{ ...tableStyles.td, textAlign: 'left', fontWeight: 600, color: 'var(--success)' }}>
                            {typeof r.lineTotal === 'number' ? r.lineTotal.toFixed(2) : r.lineTotal}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Grand Total Footer */}
            {currentRows.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: 'var(--primary-light)', borderTop: '2px solid var(--border-color)' }}>
                  <td
                    colSpan={isDiffTab ? 10 : 8}
                    style={{ ...tableStyles.td, textAlign: 'right', fontWeight: 700 }}
                  >
                    Grand Total:
                  </td>
                  <td
                    style={{ ...tableStyles.td, textAlign: 'left', fontWeight: 800, color: 'var(--text-main)' }}
                  >
                    {grandTotal.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* ==================== PAGINATION CONTROLS ==================== */}
        {filtered.length > itemsPerPage && (
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', alignItems: 'center', padding: 'var(--space-md)' }}>
            <button
              className="btn btn-secondary"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              style={{ padding: '6px 12px' }}
            >
              ←
            </button>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              className="btn btn-secondary"
              disabled={currentPage >= totalPages || totalPages === 0}
              onClick={() => setCurrentPage(prev => prev + 1)}
              style={{ padding: '6px 12px' }}
            >
              →
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

// Strict Table Styles Rule
const tableStyles = {
  th: {
    padding: '12px 16px',
    backgroundColor: 'var(--header)',
    color: '#ffffff',
    fontWeight: '600',
    fontSize: '13px',
    textAlign: 'left'
  },
  td: {
    padding: '8px 16px',
    color: 'var(--text-main)',
    fontSize: '13px',
    textAlign: 'left'
  },
  emptyCell: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '14px'
  }
};

export default SalesReport;