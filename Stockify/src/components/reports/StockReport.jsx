import { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

function StockReport() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [loading, setLoading] = useState(true);

  // ================= FILTER STATES =================
  const [stockStatus, setStockStatus] = useState(''); // '', 'in_stock', 'reorder', 'expired'
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedUom, setSelectedUom] = useState('');

  // ================= PAGINATION STATES =================
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, uomRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/products`),
        fetch(`${API_BASE_URL}/api/categories`),
        fetch(`${API_BASE_URL}/api/uoms`),
      ]);
      
      const prodData = await prodRes.json();
      const catData = await catRes.json();
      const uomData = await uomRes.json();

      setProducts(Array.isArray(prodData) ? prodData : (prodData.products || []));
      setCategories(Array.isArray(catData) ? catData : []);
      setUoms(Array.isArray(uomData) ? uomData : []);
    } catch (err) {
      console.error('Error fetching stock data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ================= HELPERS =================
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getCategoryName = (p) => {
    const cat = p.categoryId || p.category;
    if (cat && typeof cat === 'object') return cat.name || '—';
    if (typeof cat === 'string') return cat;
    return '—';
  };
  const getCategoryId = (p) => {
    const cat = p.categoryId || p.category;
    if (!cat) return '';
    return typeof cat === 'object' ? (cat._id || cat.id || '') : cat;
  };

  const getUOM = (p) => {
    const u = p.uomId || p.uom || p.unit;
    if (u && typeof u === 'object') return u.name || u.abbreviation || '—';
    if (typeof u === 'string') return u;
    return '—';
  };
  const getUomId = (p) => {
    const u = p.uomId || p.uom || p.unit;
    if (!u) return '';
    return typeof u === 'object' ? (u._id || u.id || '') : u;
  };

  // ================= FILTER LOGIC =================
  const filtered = useMemo(() => {
    let result = [...products];

    // 1. Stock Status Filter
    if (stockStatus) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (stockStatus === 'in_stock') {
        result = result.filter(p => {
          const qty = p.quantity || p.stockQuantity || 0;
          let isNotExpired = true;
          if (p.expiryDate) {
            const expDate = new Date(p.expiryDate);
            if (expDate < today) isNotExpired = false;
          }
          return qty > 0 && isNotExpired;
        });
      } else if (stockStatus === 'reorder') {
        result = result.filter(p => {
          const qty = p.quantity || p.stockQuantity || 0;
          const reorderLvl = p.reorderLevel || 0;
          return qty <= reorderLvl;
        });
      } else if (stockStatus === 'expired') {
        result = result.filter(p => {
          if (!p.expiryDate) return false;
          const expDate = new Date(p.expiryDate);
          return expDate < today;
        });
      }
    }

    // 2. Category Filter
    if (selectedCategory) {
      result = result.filter(p => getCategoryId(p) === selectedCategory);
    }

    // 3. UOM Filter
    if (selectedUom) {
      result = result.filter(p => getUomId(p) === selectedUom);
    }

    return result;
  }, [products, stockStatus, selectedCategory, selectedUom]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [stockStatus, selectedCategory, selectedUom]);

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedUom('');
  };

  const columns = ['Sr#', 'Date', 'Code', 'Product Name', 'Category', 'UOM', 'Qty Available', 'Reorder Level', 'Expiry Date'];

  const getRow = (p, idx) => [
    idx + 1,
    formatDate(p.createdAt || p.date),
    p.name || '—',
    getCategoryName(p),
    getUOM(p),
    p.quantity || p.stockQuantity || 0,
    p.reorderLevel || 0,
    formatDate(p.expiryDate)
  ];

  // ==================== PRINT ====================
  const handlePrint = () => {
    const rowsHtml = filtered.map((p, idx) => {
      const qty = p.quantity || p.stockQuantity || 0;
      const reorderLvl = p.reorderLevel || 0;
      const isLowStock = qty <= reorderLvl;

      let expiryStyle = '';
      if (p.expiryDate && new Date(p.expiryDate) < new Date()) {
        expiryStyle = 'color: #ef4444; font-weight: bold;';
      }

      return `
      <tr>
        <td style="text-align: center; width: 40px;">${idx + 1}</td>
        <td style="width: 80px;">${formatDate(p.createdAt || p.date)}</td>
        <td style="width: 150px; font-weight: bold;">${p.name || '—'}</td>
        <td style="width: 100px;">${getCategoryName(p)}</td>
        <td style="width: 60px;">${getUOM(p)}</td>
        <td style="width: 90px; font-weight: bold; color: ${isLowStock ? '#ef4444' : '#16a34a'};">${qty}</td>
        <td style="width: 90px;">${reorderLvl}</td>
        <td style="width: 90px; ${expiryStyle}">${formatDate(p.expiryDate)}</td>
      </tr>
    `}).join('');

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
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; word-wrap: break-word; }
            th { background: #f1f5f9; color: #334155; text-transform: uppercase; font-size: 10px; font-weight: 700; border-bottom: 2px solid #94a3b8; }
            tr:nth-child(even) { background-color: #f8fafc; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <h2>Stock Report</h2>
              <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
            <p><strong>Total:</strong> ${filtered.length} product(s)</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">Sr#</th>
                <th style="width: 80px;">Date</th>
                <th style="width: 80px;">Code</th>
                <th style="width: 150px;">Product Name</th>
                <th style="width: 100px;">Category</th>
                <th style="width: 60px;">UOM</th>
                <th style="width: 90px;">Qty Available</th>
                <th style="width: 90px;">Reorder Level</th>
                <th style="width: 90px;">Expiry Date</th>
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
    doc.text('Stock Report', 14, 12);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on ${new Date().toLocaleString()} — ${filtered.length} product(s)`, 14, 18);

    autoTable(doc, {
      startY: 22,
      head: [columns],
      body: filtered.map((p, idx) => getRow(p, idx)),
      styles: { fontSize: 9, cellPadding: 5, lineColor: [203, 213, 225], lineWidth: 0.1 },
      headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 20 },
        2: { cellWidth: 20 },
        3: { cellWidth: 40 },
        4: { cellWidth: 30 },
        5: { cellWidth: 20 },
        6: { cellWidth: 25 },
        7: { cellWidth: 25 },
        8: { cellWidth: 25 }
      }
    });
    doc.save(`stock-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ==================== EXCEL EXPORT ====================
  const handleExportExcel = () => {
    const rows = filtered.map((p, idx) => ({
      'Sr#': idx + 1,
      'Date': formatDate(p.createdAt || p.date),
      'Product Name': p.name || '',
      'Category': getCategoryName(p),
      'UOM': getUOM(p),
      'Qty Available': p.quantity || p.stockQuantity || 0,
      'Reorder Level': p.reorderLevel || 0,
      'Expiry Date': formatDate(p.expiryDate),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Set manual column widths
    worksheet['!cols'] = [
      { wch: 5 },   // Sr#
      { wch: 12 },  // Date
      { wch: 30 },  // Product Name
      { wch: 20 },  // Category
      { wch: 15 },  // UOM
      { wch: 15 },  // Qty Available
      { wch: 15 },  // Reorder Level
      { wch: 15 },  // Expiry Date
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock');
    XLSX.writeFile(workbook, `stock-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ================= PAGINATION LOGIC =================
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div style={styles.tabContainer}>
          <button style={stockStatus === '' ? styles.activeTab : styles.tab} onClick={() => setStockStatus('')}>
            All Stock
          </button>
          <button style={stockStatus === 'in_stock' ? styles.activeTab : styles.tab} onClick={() => setStockStatus('in_stock')}>
            Available Stock
          </button>
          <button style={stockStatus === 'reorder' ? styles.activeTab : styles.tab} onClick={() => setStockStatus('reorder')}>
            Reorder Stock
          </button>
          <button style={stockStatus === 'expired' ? styles.activeTab : styles.tab} onClick={() => setStockStatus('expired')}>
            Expired Stock
          </button>

          <button style={{ ...styles.actionBtn, backgroundColor: '#409fb0', marginLeft: 'auto' }} onClick={handlePrint}><FontAwesomeIcon icon={faPrint} /> Print</button>
          <button style={{ ...styles.actionBtn, backgroundColor: '#d66336' }} onClick={handleExportPDF}><FontAwesomeIcon icon={faFilePdf} /> PDF</button>
          <button style={{ ...styles.actionBtn, backgroundColor: '#296f3f' }} onClick={handleExportExcel}><FontAwesomeIcon icon={faFileExcel} /> Excel</button>
        </div>
      </div>

      {/* ==================== FILTERS ==================== */}
      <div style={styles.filterRow}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Category</label>
          <select style={styles.filterInput} value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat._id || cat.id} value={cat._id || cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>UOM</label>
          <select style={styles.filterInput} value={selectedUom} onChange={(e) => setSelectedUom(e.target.value)}>
            <option value="">All UOMs</option>
            {uoms.map(uom => (
              <option key={uom._id || uom.id} value={uom._id || uom.id}>{uom.name || uom.abbreviation}</option>
            ))}
          </select>
        </div>

      
        <div style={styles.filterStats}>
          Showing {currentProducts.length} of {filtered.length} record(s)
        </div>
      </div>

      {/* ==================== TABLE ==================== */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '50px', textAlign: 'center' }}>Sr#</th>
              <th style={{ ...styles.th, width: '100px' }}>Date</th>
              <th style={{ ...styles.th, width: '150px' }}>Product Name</th>
              <th style={{ ...styles.th, width: '120px' }}>Category</th>
              <th style={{ ...styles.th, width: '110px' }}>UOM</th>
              <th style={{ ...styles.th, width: '110px' }}>Qty Available</th>
              <th style={{ ...styles.th, width: '110px' }}>Reorder Level</th>
              <th style={{ ...styles.th, width: '110px' }}>Expiry Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" style={styles.emptyCell}>Loading...</td></tr>
            ) : currentProducts.length === 0 ? (
              <tr><td colSpan="9" style={styles.emptyCell}>No stock records found matching your filters.</td></tr>
            ) : (
              currentProducts.map((p, idx) => {
                const qty = p.quantity || p.stockQuantity || 0;
                const reorderLvl = p.reorderLevel || 0;
                const isLowStock = qty <= reorderLvl;

                let isExpired = false;
                if (p.expiryDate && new Date(p.expiryDate) < new Date()) {
                  isExpired = true;
                }

                const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;

                return (
                  <tr key={p._id || idx} style={idx % 2 === 1 ? styles.altRow : null}>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{serialNumber}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{formatDate(p.createdAt || p.date)}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{p.name || '—'}</td>
                    <td style={styles.td}>{getCategoryName(p)}</td>
                    <td style={styles.td}>{getUOM(p)}</td>
                    <td style={{ ...styles.td, fontWeight: 'bold', color: isLowStock ? '#ef4444' : '#16a34a' }}>
                      {qty}
                    </td>
                    <td style={styles.td}>{reorderLvl}</td>
                    <td style={{ ...styles.td, color: isExpired ? '#ef4444' : '#334155', fontWeight: isExpired ? 'bold' : 'normal' }}>
                      {formatDate(p.expiryDate)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ==================== PAGINATION CONTROLS ==================== */}
      {filtered.length > itemsPerPage && (
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
      )}
    </div>
  );
}

const styles = {
  page: { padding: '25px 15px', background: '#f8fafc', minHeight: '100%', marginBottom: '60px' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' },
  actions: { display: 'flex', gap: '10px' },
  actionBtn: { color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },

  // Tab styles
  tabContainer: { display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap', width: '100%' },
  tab: { padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s ease-in-out' },
  activeTab: { padding: '10px 18px', borderRadius: '6px', border: '1px solid #3c4e6b', backgroundColor: '#3c4e6b', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s ease-in-out' },

  // Filter styles
  filterRow: { display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' },
  filterGroup: { display: 'flex', flexDirection: 'column', minWidth: '180px', maxWidth: '220px' },
  filterLabel: { fontSize: '11px', fontWeight: 500, color: '#475569', textAlign: 'left' },
  filterInput: { padding: '6.4px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' },
  clearFilterBtn: { padding: '10px 18px', background: '#6c757d', color: '#f9f9f9', border: '1px solid #cfcece', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' },
  filterStats: { marginLeft: 'auto', fontSize: '13px', color: '#64748b', textAlign: 'right' },

  tableWrapper: { marginTop: '15px', background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' },
  th: { textAlign: 'left', padding: '12px 14px', background: '#3c4e6b', fontSize: '11px', color: '#fefefe', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #94a3b8', borderRight: '1px solid #44576e', whiteSpace: 'nowrap' },
  td: { padding: '10px 14px', textAlign: 'left', fontSize: '13px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', color: '#334155', whiteSpace: 'nowrap' },
  altRow: { backgroundColor: '#f8fafc' },
  emptyCell: { textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '14px' },
};

export default StockReport;