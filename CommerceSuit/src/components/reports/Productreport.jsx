import { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCartShopping, faCirclePause, faCreditCard, faPrint, faTrash, faClipboardList, faFileLines, faCashRegister, faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';


const API_BASE_URL = 'http://localhost:5000';

function ProductReport() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter mode states: 'all' or 'category'
  const [filterMode, setFilterMode] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/products`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/categories`);
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategories([]);
    }
  };

  const getCategoryName = (p) => {
    const cat = p.categoryId;
    if (!cat) return '—';
    return typeof cat === 'object' ? (cat.name || '—') : cat;
  };

  const getCategoryId = (p) => {
    const cat = p.categoryId;
    if (!cat) return '';
    return typeof cat === 'object' ? (cat._id || cat.id || '') : cat;
  };

  const getUomName = (p) => {
    const uom = p.uomId;
    if (!uom) return '—';
    return typeof uom === 'object' ? (uom.name || uom.abbreviation || '—') : uom;
  };

  const filtered = useMemo(() => {
    let result = products;

    // 1. Filter by Mode (All vs Category)
    if (filterMode === 'category' && selectedCategory) {
      result = result.filter(p => getCategoryId(p) === selectedCategory);
    }

    // 2. Filter by Search Term
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter(p =>
        (p.name || '').toLowerCase().includes(term) ||
        getCategoryName(p).toLowerCase().includes(term) ||
        getUomName(p).toLowerCase().includes(term)
      );
    }

    return result;
  }, [products, filterMode, selectedCategory, searchTerm]);

  const columns = ['Sr#', 'Product Name', 'Category', 'UOM', 'Cost Price', 'Retail Price', 'Stock Qty'];

  const getRow = (p, idx) => [
    idx + 1,
    p.name || '—',
    getCategoryName(p),
    getUomName(p),
    Number(p.costPrice || 0).toFixed(2),
    Number(p.retailPrice || 0).toFixed(2),
    p.quantity ?? 0,
  ];

  // ==================== PRINT ====================
  const handlePrint = () => {
    const rowsHtml = filtered.map((p, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${p.name || '—'}</td>
        <td>${getCategoryName(p)}</td>
        <td>${getUomName(p)}</td>
        <td>${Number(p.costPrice || 0).toFixed(2)}</td>
        <td>${Number(p.retailPrice || 0).toFixed(2)}</td>
        <td>${p.quantity ?? 0}</td>
      </tr>
    `).join('');

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '297mm';
    iframe.style.height = '10px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <html>
        <head>
          <style>
            * { box-sizing: border-box; }
            @page { size: A4 landscape; margin: 14mm; }
            body { font-family: Arial, sans-serif; color: #000; padding: 0; }
            h2 { margin: 0 0 4px 0; }
            p { margin: 0 0 16px 0; color: #444; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
            th { background: #3c4e6b; color: #fff; text-transform: uppercase; font-size: 11px; }
          </style>
        </head>
        <body>
          <h2>Product Report</h2>
          <p>Generated on ${new Date().toLocaleString()} — ${filtered.length} product(s)</p>
          <table>
            <thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
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
    doc.text('Product Report', 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated on ${new Date().toLocaleString()} — ${filtered.length} product(s)`, 14, 21);

    autoTable(doc, {
      startY: 26,
      head: [columns],
      body: filtered.map((p, idx) => getRow(p, idx)),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [60, 78, 107] }
    });

    doc.save(`product-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ==================== EXCEL EXPORT ====================
  const handleExportExcel = () => {
    const rows = filtered.map((p, idx) => ({
      'Sr#': idx + 1,
      'Product Name': p.name || '',
      'Category': getCategoryName(p),
      'UOM': getUomName(p),
      'Cost Price': Number(p.costPrice || 0),
      'Retail Price': Number(p.retailPrice || 0),
      'Stock Qty': p.quantity ?? 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, `product-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>📦 Product Report</h2>
        <div style={styles.actions}>
          <button style={{backgroundColor:'#409fb0'}} onClick={handlePrint}><FontAwesomeIcon icon={faPrint} /> Print</button>
          <button style={{backgroundColor:'#d66336'}} onClick={handleExportPDF}><FontAwesomeIcon icon={faFilePdf} /> PDF</button>
          <button style={{backgroundColor:'#296f3f'}} onClick={handleExportExcel}><FontAwesomeIcon icon={faFileExcel} />  Excel</button>
        </div>
      </div>

      {/* Filter Mode Selection (Radio Buttons) */}
      <div style={styles.filterCard}>
        <div style={styles.radioGroup}>
          <label style={styles.radioLabel}>
            <input
              type="radio"
              name="filterMode"
              value="all"
              className="clean-radio"
              checked={filterMode === 'all'}
              onChange={() => {
                setFilterMode('all');
                setSelectedCategory('');
              }}
            />
            All Products
          </label>
          <label style={styles.radioLabel}>
            <input
              type="radio"
              name="filterMode"
              value="category"
              className="clean-radio"
              checked={filterMode === 'category'}
              onChange={() => setFilterMode('category')}
            />
            By Category
          </label>
        </div>

        {/* Category Dropdown (Appears only when 'By Category' is selected) */}
        {filterMode === 'category' && (
          <div style={styles.categoryDropdownWrapper}>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={styles.selectDropdown}
            >
              <option value="">-- Select Category --</option>
              {categories.map((cat) => (
                <option key={cat._id || cat.id} value={cat._id || cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col} style={styles.th}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} style={styles.emptyCell}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={columns.length} style={styles.emptyCell}>No products found.</td></tr>
            ) : (
              filtered.map((p, idx) => (
                <tr key={p._id}>
                  <td style={styles.td}>{idx + 1}</td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{p.name || '—'}</td>
                  <td style={styles.td}>{getCategoryName(p)}</td>
                  <td style={styles.td}>{getUomName(p)}</td>
                  <td style={styles.td}>{Number(p.costPrice || 0).toFixed(2)}</td>
                  <td style={styles.td}>{Number(p.retailPrice || 0).toFixed(2)}</td>
                  <td style={{ ...styles.td, fontWeight: 600, color: (p.quantity ?? 0) <= (p.reorderQuantity ?? 0) ? '#ef4444' : '#0f172a' }}>
                    {p.quantity ?? 0}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '24px', background: '#f8fafc', minHeight: '100%' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' },
  title: { margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' },
  actions: { display: 'flex', gap: '10px' },
  actionBtn: { background: '#3c4e6b', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  filterCard: { background: '#fff', padding: '16px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' },
  radioGroup: { display: 'flex', gap: '20px', alignItems: 'center' },
  radioLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: '#334155', cursor: 'pointer' },
  categoryDropdownWrapper: { display: 'flex', alignItems: 'center', flex: 1, minWidth: '220px', maxWidth: '300px' },
  selectDropdown: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff', color: '#334155', cursor: 'pointer' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' },
  searchInput: { flex: '1', maxWidth: '360px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff' },
  countLabel: { fontSize: '13px', color: '#64748b', fontWeight: 500 },
  tableWrapper: { background: '#fff', borderRadius: '12px', border: '1px solid #cbd5e1', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', background: '#3c4e6b', fontSize: '12px', color: '#fff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  td: { padding: '10px 16px', textAlign: 'left', fontSize: '14px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
  emptyCell: { textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '14px' }
};

// Injection of Custom CSS for perfect white background radio buttons
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    .clean-radio {
      appearance: none;
      -webkit-appearance: none;
      width: 1px;
      height: 1px;
      border: 2px solid #cbd5e1;
      border-radius: 50%;
      background-color: #ffffff !important;
      cursor: pointer;
      position: relative;
      margin: 0;
      outline: none;
      transition: all 0.2s ease-in-out;
    }
    .clean-radio:checked {
      border-color: #303a4b;
      background-color: #ffffff !important;
    }
    .clean-radio:checked::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: #3c4e6b;
    }
    .clean-radio:hover {
      border-color: #94a3b8;
    }
  `;
  document.head.appendChild(styleSheet);
}

export default ProductReport;