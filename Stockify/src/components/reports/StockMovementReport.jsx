import { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

function StockMovementReport() {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // ================= FILTER STATES =================
  const [selectedProduct, setSelectedProduct] = useState('');
  const [movementType, setMovementType] = useState(''); // 'IN' or 'OUT'
  const [referenceType, setReferenceType] = useState(''); 
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // ================= PAGINATION =================
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [movRes, prodRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/stock-movements`),
        fetch(`${API_BASE_URL}/api/products`)
      ]);
      const movData = await movRes.json();
      const prodData = await prodRes.json();

      setMovements(Array.isArray(movData) ? movData : []);
      setProducts(Array.isArray(prodData) ? prodData : (prodData.products || []));
    } catch (err) {
      console.error('Error fetching stock movements:', err);
      setMovements([]);
    } finally {
      setLoading(false);
    }
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProduct, movementType, referenceType, fromDate, toDate]);

  // ================= HELPERS =================
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getProductName = (m) => {
    if (!m.product) return '—';
    return typeof m.product === 'object' ? (m.product.name || '—') : m.product;
  };

  const clearFilters = () => {
    setSelectedProduct('');
    setMovementType('');
    setReferenceType('');
    setFromDate('');
    setToDate('');
  };

  // Get dynamic unique reference types from the data (e.g., Sale, Purchase, StockBreakage)
  const uniqueRefTypes = useMemo(() => {
    const types = new Set(movements.map(m => m.referenceType).filter(Boolean));
    return Array.from(types);
  }, [movements]);

  // ================= FILTER LOGIC =================
  const filtered = useMemo(() => {
    let result = [...movements];

    if (selectedProduct) {
      result = result.filter(m => {
        const pId = typeof m.product === 'object' ? m.product._id : m.product;
        return pId === selectedProduct;
      });
    }

    if (movementType) {
      result = result.filter(m => m.movementType === movementType);
    }

    if (referenceType) {
      result = result.filter(m => m.referenceType === referenceType);
    }

    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      result = result.filter(m => {
        const d = new Date(m.createdAt || m.date);
        return d >= from && d <= to;
      });
    }

    return result;
  }, [movements, selectedProduct, movementType, referenceType, fromDate, toDate]);

  // ================= COLUMN CONFIG =================
  const columns = ['Sr#', 'Date', 'Product Name', 'Movement Type', 'Qty', 'Reference', 'Notes'];

  const getRow = (item, idx) => [
    idx + 1,
    formatDate(item.createdAt || item.date),
    getProductName(item),
    item.movementType || '—',
    item.quantity || 0,
    item.referenceType || '—',
    item.notes || '—'
  ];

  // ==================== PRINT ====================
  const handlePrint = () => {
    const rowsHtml = filtered.map((item, idx) => {
      const row = getRow(item, idx);
      const isIN = row[3] === 'IN';
      const isOUT = row[3] === 'OUT';
      
      let typeStyle = '';
      if (isIN) typeStyle = 'color: #16a34a; font-weight: bold;';
      if (isOUT) typeStyle = 'color: #ef4444; font-weight: bold;';

      return `<tr>
        <td style="text-align:center; width:40px;">${row[0]}</td>
        <td style="width:80px;">${row[1]}</td>
        <td style="width:160px; font-weight:600;">${row[2]}</td>
        <td style="width:100px; ${typeStyle}">${row[3]}</td>
        <td style="width:80px; font-weight:bold; ${typeStyle}">${row[4]}</td>
        <td style="width:120px;">${row[5]}</td>
        <td style="width:180px; font-size:10px;">${row[6]}</td>
      </tr>`;
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
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; word-wrap: break-word; }
            th { background: #f1f5f9; color: #334155; text-transform: uppercase; font-size: 10px; font-weight: 700; border-bottom: 2px solid #94a3b8; text-align:left; }
            tr:nth-child(even) { background-color: #f8fafc; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <h2>Stock Movement Report</h2>
              <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
            <p><strong>Total Records:</strong> ${filtered.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:40px; text-align:center;">Sr#</th>
                <th style="width:80px;">Date</th>
                <th style="width:160px;">Product Name</th>
                <th style="width:100px;">Movement Type</th>
                <th style="width:80px;">Qty</th>
                <th style="width:120px;">Reference</th>
                <th style="width:180px;">Notes</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
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
    doc.text('Stock Movement Report', 14, 12);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on ${new Date().toLocaleString()} — ${filtered.length} record(s)`, 14, 18);

    autoTable(doc, {
      startY: 22,
      head: [columns],
      body: filtered.map((item, idx) => getRow(item, idx)),
      styles: { fontSize: 9, cellPadding: 4, lineColor: [203, 213, 225], lineWidth: 0.1 },
      headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        3: { fontStyle: 'bold' },
        4: { fontStyle: 'bold' }
      },
      didParseCell: function (data) {
        if (data.section === 'body' && (data.column.index === 3 || data.column.index === 4)) {
          const type = data.row.raw[3];
          if (type === 'IN') data.cell.styles.textColor = [22, 163, 74];
          if (type === 'OUT') data.cell.styles.textColor = [220, 38, 38];
        }
      }
    });
    doc.save(`stock-movement-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ==================== EXCEL EXPORT ====================
  const handleExportExcel = () => {
    const rows = filtered.map((item, idx) => {
      const obj = {};
      const row = getRow(item, idx);
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet['!cols'] = [
      { wch: 6 },   // Sr#
      { wch: 12 },  // Date
      { wch: 35 },  // Product Name
      { wch: 18 },  // Movement Type
      { wch: 12 },  // Qty
      { wch: 20 },  // Reference
      { wch: 40 }   // Notes
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Movements');
    XLSX.writeFile(workbook, `stock-movements-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ================= PAGINATION =================
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRows = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div style={{ ...styles.actions, marginLeft: 'auto' }}>
          <button style={{ ...styles.actionBtn, backgroundColor: '#409fb0' }} onClick={handlePrint}><FontAwesomeIcon icon={faPrint} /> Print</button>
          <button style={{ ...styles.actionBtn, backgroundColor: '#d66336' }} onClick={handleExportPDF}><FontAwesomeIcon icon={faFilePdf} /> PDF</button>
          <button style={{ ...styles.actionBtn, backgroundColor: '#296f3f' }} onClick={handleExportExcel}><FontAwesomeIcon icon={faFileExcel} /> Excel</button>
        </div>
      </div>

      {/* ==================== FILTERS ==================== */}
      <div style={styles.filterRow}>
        
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Select Product</label>
          <select 
            style={styles.filterInput} 
            value={selectedProduct} 
            onChange={(e) => setSelectedProduct(e.target.value)}
          >
            <option value="">All Products</option>
            {products.map(p => (
               <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Movement Type</label>
          <select 
            style={styles.filterInput} 
            value={movementType} 
            onChange={(e) => setMovementType(e.target.value)}
          >
            <option value="">All (IN/OUT)</option>
            <option value="IN">Stock IN (+)</option>
            <option value="OUT">Stock OUT (-)</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Reference (Source)</label>
          <select 
            style={styles.filterInput} 
            value={referenceType} 
            onChange={(e) => setReferenceType(e.target.value)}
          >
            <option value="">All Sources</option>
            {uniqueRefTypes.map((type, i) => (
               <option key={i} value={type}>{type}</option>
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

        <button style={styles.clearFilterBtn} onClick={clearFilters}>Clear Filters</button>

      </div>
      
      <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 400, textAlign: 'right', marginTop: '10px' }}>
        Showing {currentRows.length} of {filtered.length} record(s)
      </div>

      {/* ==================== TABLE ==================== */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={i} style={{ ...styles.th, textAlign: i === 0 ? 'center' : 'left', width: i === 0 ? '50px' : 'auto' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} style={styles.emptyCell}>Loading stock movements...</td></tr>
            ) : currentRows.length === 0 ? (
              <tr><td colSpan={columns.length} style={styles.emptyCell}>No stock movements found.</td></tr>
            ) : (
              currentRows.map((item, idx) => {
                const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                const row = getRow(item, idx);
                row[0] = serialNumber;

                const isIN = item.movementType === 'IN';
                const isOUT = item.movementType === 'OUT';

                return (
                  <tr key={item._id || idx} style={idx % 2 === 1 ? styles.altRow : null}>
                    {row.map((cell, colIdx) => {
                      let cellStyle = { ...styles.td, textAlign: colIdx === 0 ? 'center' : 'left' };
                      
                      // Highlight Product Name
                      if (colIdx === 2) cellStyle = { ...cellStyle, fontWeight: 600 };
                      
                      // Color IN and OUT
                      if ((colIdx === 3 || colIdx === 4) && isIN) cellStyle = { ...cellStyle, color: '#16a34a', fontWeight: 'bold' };
                      if ((colIdx === 3 || colIdx === 4) && isOUT) cellStyle = { ...cellStyle, color: '#ef4444', fontWeight: 'bold' };
                      
                      return <td key={colIdx} style={cellStyle}>{cell}</td>;
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ==================== PAGINATION ==================== */}
      {filtered.length > itemsPerPage && (
        <div style={{ marginTop: '20px', display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', paddingBottom: '20px' }}>
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            style={{
              padding: '8px 16px',
              backgroundColor: currentPage <= 1 ? '#e9ecef' : '#5aa7ef',
              color: currentPage <= 1 ? '#6c757d' : 'white',
              border: 'none', borderRadius: '4px',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', fontWeight: '600'
            }}
          >
            ←
          </button>
          <span style={{ fontSize: '12px', fontWeight: '400', color: '#8f959b' }}>
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            disabled={currentPage >= totalPages || totalPages === 0}
            onClick={() => setCurrentPage(prev => prev + 1)}
            style={{
              padding: '8px 16px',
              backgroundColor: (currentPage >= totalPages || totalPages === 0) ? '#e9ecef' : '#5aa7ef',
              color: (currentPage >= totalPages || totalPages === 0) ? '#6c757d' : 'white',
              border: 'none', borderRadius: '4px',
              cursor: (currentPage >= totalPages || totalPages === 0) ? 'not-allowed' : 'pointer', fontWeight: '600'
            }}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '24px 16px', width: '100%', boxSizing: 'border-box', background: '#f8fafc', minHeight: '100vh', marginBottom: '60px' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' },
  title: { margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' },
  actionBtn: { color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  actions: { display: 'flex', gap: '10px' },

  filterRow: { marginTop: '7px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' },
  filterGroup: { display: 'flex', flexDirection: 'column', minWidth: '100px', maxWidth: '220px', flex: 1 },
  filterLabel: { fontSize: '11px', fontWeight: 500, color: '#475569', textAlign: 'left' },
  filterInput: { color: '#343a42', padding: '6.4px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' },
  clearFilterBtn: { padding: '10px 18px', background: '#6c757d', color: '#f9f9f9', border: '1px solid #cfcece', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' },

  tableWrapper: { marginTop: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', width: '100%' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' },
  th: { padding: '12px 14px', background: '#3c4e6b', fontSize: '11px', color: '#fefefe', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #94a3b8', borderRight: '1px solid #44576e', whiteSpace: 'nowrap' },
  td: { padding: '10px 14px', fontSize: '13px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', color: '#334155' },
  altRow: { backgroundColor: '#f8fafc' },
  emptyCell: { textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '14px' },
};

export default StockMovementReport;