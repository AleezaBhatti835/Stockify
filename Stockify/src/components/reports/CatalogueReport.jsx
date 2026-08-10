import { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

const TABS = [
  { key: 'product', label: 'Product Report' },
  { key: 'category', label: 'Category Report' },
  { key: 'uom', label: 'UOM Report' },
];

function CatalogueReport() {
  const [activeTab, setActiveTab] = useState('product');

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [loading, setLoading] = useState(true);

  // ================= FILTER STATES =================
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedUom, setSelectedUom] = useState('');

  // ================= PAGINATION =================
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    setSelectedCategory('');
    setSelectedUom('');
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedUom]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, uomRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/products`),
        fetch(`${API_BASE_URL}/api/categories`),
        fetch(`${API_BASE_URL}/api/uoms`),
      ]);
      const [prodData, catData, uomData] = await Promise.all([
        prodRes.json(), catRes.json(), uomRes.json()
      ]);
      setProducts(Array.isArray(prodData) ? prodData : []);
      setCategories(Array.isArray(catData) ? catData : []);
      setUoms(Array.isArray(uomData) ? uomData : []);
    } catch (err) {
      console.error('Error fetching catalogue data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ================= HELPERS =================
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';

  const getCategoryName = (p) => {
    const cat = p.categoryId || p.category;
    if (!cat) return '—';
    return typeof cat === 'object' ? (cat.name || '—') : cat;
  };
  const getCategoryId = (p) => {
    const cat = p.categoryId || p.category;
    if (!cat) return '';
    return typeof cat === 'object' ? (cat._id || cat.id || '') : cat;
  };
  const getUomName = (p) => {
    const uom = p.uomId || p.uom || p.unit;
    if (!uom) return '—';
    return typeof uom === 'object' ? (uom.name || uom.abbreviation || '—') : uom;
  };
  const getUomId = (p) => {
    const uom = p.uomId || p.uom || p.unit;
    if (!uom) return '';
    return typeof uom === 'object' ? (uom._id || uom.id || '') : uom;
  };

  // ================= FILTERED DATA PER TAB =================
  const filtered = useMemo(() => {
    if (activeTab === 'product') {
      let result = [...products];
      if (selectedCategory) result = result.filter(p => getCategoryId(p) === selectedCategory);
      if (selectedUom) result = result.filter(p => getUomId(p) === selectedUom);
      result.sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
      return result;
    }

    if (activeTab === 'category') {
      return [...categories];
    }

    if (activeTab === 'uom') {
      return [...uoms];
    }

    return [];
  }, [activeTab, products, categories, uoms, selectedCategory, selectedUom]);

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedUom('');
  };

  // ================= COLUMN CONFIG PER TAB =================
  const columns = useMemo(() => {
    if (activeTab === 'product') return ['Sr#', 'Date', 'Product Name', 'Category', 'UOM', 'Cost Price', 'Retail Price', 'Stock Qty'];
    if (activeTab === 'category') return ['Sr#', 'Category Name', 'Date Added'];
    if (activeTab === 'uom') return ['Sr#', 'UOM Name', 'Code / Symbol', 'Added Date'];
    return [];
  }, [activeTab]);

  const getRow = (item, idx) => {
    if (activeTab === 'product') {
      return [idx + 1, formatDate(item.createdAt || item.date), item.name || '—', getCategoryName(item), getUomName(item),
      Number(item.costPrice || 0).toFixed(2), Number(item.retailPrice || 0).toFixed(2), item.quantity ?? 0];
    }
    if (activeTab === 'category') {
      return [idx + 1, item.name || '—', formatDate(item.createdAt || item.date)];
    }
    if (activeTab === 'uom') {
      return [idx + 1, item.name || '—', item.code || item.symbol || '—', formatDate(item.createdAt || item.date)];
    }
    return [];
  };

  const activeTabLabel = TABS.find(t => t.key === activeTab)?.label || '';

  // ==================== PRINT ====================
  const handlePrint = () => {
    const rowsHtml = filtered.map((item, idx) => {
      const row = getRow(item, idx);
      return `<tr>${row.map((cell, i) => `<td style="${i === 0 ? 'text-align:center; width: 40px;' : 'text-align:left;'}">${cell}</td>`).join('')}</tr>`;
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
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: Arial, sans-serif; color: #000; padding: 0; margin: 0; }
            .header-container { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; }
            h2 { margin: 0; font-size: 18px; color: #0f172a; }
            p { margin: 0; color: #64748b; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; word-wrap: break-word; }
            th { background: #f1f5f9; color: #334155; text-align: left; text-transform: uppercase; font-size: 10px; font-weight: 700; border-bottom: 2px solid #94a3b8; }
            tr:nth-child(even) { background-color: #f8fafc; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <h2>${activeTabLabel}</h2>
              <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
            <p><strong>Total:</strong> ${filtered.length} record(s)</p>
          </div>
          <table>
            <thead><tr>${columns.map((c, i) => `<th style="${i === 0 ? 'text-align:center; width: 40px;' : ''}">${c}</th>`).join('')}</tr></thead>
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
    const doc = new jsPDF({ orientation: 'portrait' });
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(activeTabLabel, 14, 12);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on ${new Date().toLocaleString()} — ${filtered.length} record(s)`, 14, 18);

    autoTable(doc, {
      startY: 22,
      head: [columns],
      body: filtered.map((item, idx) => getRow(item, idx)),
      styles: { fontSize: 9, cellPadding: 5, lineColor: [203, 213, 225], lineWidth: 0.1 },
      headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' } // Making Sr# column narrow in PDF
      }
    });
    doc.save(`${activeTab}-report-${new Date().toISOString().slice(0, 10)}.pdf`);
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

    // Setting optimal column widths for Excel based on active tab
    if (activeTab === 'product') {
      worksheet['!cols'] = [
        { wch: 8 },  // Sr#
        { wch: 15 }, // Date
        { wch: 30 }, // Product Name
        { wch: 20 }, // Category
        { wch: 15 }, // UOM
        { wch: 15 }, // Cost Price
        { wch: 15 }, // Retail Price
        { wch: 15 }  // Stock Qty
      ];
    } else if (activeTab === 'category') {
      worksheet['!cols'] = [
        { wch: 8 },  // Sr#
        { wch: 30 }, // Category Name
        { wch: 20 }  // Date Added
      ];
    } else if (activeTab === 'uom') {
      worksheet['!cols'] = [
        { wch: 8 },  // Sr#
        { wch: 25 }, // UOM Name
        { wch: 20 }, // Code / Symbol
        { wch: 20 }  // Added Date
      ];
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTabLabel);
    XLSX.writeFile(workbook, `${activeTab}-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ================= PAGINATION =================
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

      {/* ==================== FILTERS ==================== */}
      <div style={styles.filterRow}>
        {activeTab === 'product' && (
          <>
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
          </>
        )}

       

        <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#64748b', fontWeight: 400 }}>
          Showing {currentRows.length} of {filtered.length} record(s)
        </div>
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
              <tr><td colSpan={columns.length} style={styles.emptyCell}>Loading...</td></tr>
            ) : currentRows.length === 0 ? (
              <tr><td colSpan={columns.length} style={styles.emptyCell}>No records found matching your filters.</td></tr>
            ) : (
              currentRows.map((item, idx) => {
                const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                const row = getRow(item, idx);
                row[0] = serialNumber;

                const qty = item.quantity ?? 0;
                const reorderLvl = item.reorderLevel ?? 0;
                const isLowStock = qty <= reorderLvl;

                return (
                  <tr key={item._id || idx} style={idx % 2 === 1 ? styles.altRow : null}>
                    {row.map((cell, colIdx) => {
                      let cellStyle = { ...styles.td, textAlign: colIdx === 0 ? 'center' : 'left' };
                      if (activeTab === 'product' && columns[colIdx] === 'Stock Qty') {
                        cellStyle = { ...cellStyle, fontWeight: 'bold', color: isLowStock ? '#ef4444' : '#16a34a' };
                      }
                      if (activeTab === 'product' && colIdx === 2) cellStyle = { ...cellStyle, fontWeight: 600 };
                      if (activeTab !== 'product' && colIdx === 1) cellStyle = { ...cellStyle, fontWeight: 600 };
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
              backgroundColor: currentPage <= 1 ? '#e9ecef' : '#3c4e6b',
              color: currentPage <= 1 ? '#6c757d' : 'white',
              border: 'none', borderRadius: '4px',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', fontWeight: '600'
            }}
          >
            ←
          </button>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            disabled={currentPage >= totalPages || totalPages === 0}
            onClick={() => setCurrentPage(prev => prev + 1)}
            style={{
              padding: '8px 16px',
              backgroundColor: (currentPage >= totalPages || totalPages === 0) ? '#e9ecef' : '#3c4e6b',
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
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' },
  actionBtn: { color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },

  tabContainer: { display: 'flex', gap: '10px', flexWrap: 'wrap', width: '100%', alignItems: 'center' },
  tab: { padding: '10px 18px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s ease-in-out' },
  activeTab: { padding: '10px 18px', borderRadius: '6px', border: '1px solid #3c4e6b', backgroundColor: '#3c4e6b', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s ease-in-out' },

  filterRow: { marginTop: '10px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' },
  filterGroup: { display: 'flex', flexDirection: 'column', minWidth: '180px', maxWidth: '220px' },
  filterLabel: { fontSize: '11px', fontWeight: 500, color: '#475569', textAlign: 'left' },
  filterInput: { color: '#343a42', padding: '6.4px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' },
  clearFilterBtn: { padding: '10px 18px', background: '#6c757d', color: '#f9f9f9', border: '1px solid #cfcece', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' },

  tableWrapper: { marginTop: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', width: '100%' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' },
  th: { padding: '10px 12px', background: '#3c4e6b', fontSize: '11px', color: '#fefefe', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #94a3b8', borderRight: '1px solid #44576e', whiteSpace: 'nowrap' },
  td: { padding: '9px 12px', fontSize: '13px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', color: '#334155', whiteSpace: 'nowrap' },
  altRow: { backgroundColor: '#f8fafc' },
  emptyCell: { textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '14px' },
};

export default CatalogueReport;