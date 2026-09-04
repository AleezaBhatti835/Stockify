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

  // ================= FETCH ALL (WITH TOKEN) =================
  const fetchAll = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };

      const [prodRes, catRes, uomRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/products`, { headers }),
        fetch(`${API_BASE_URL}/api/categories`, { headers }),
        fetch(`${API_BASE_URL}/api/uoms`, { headers }),
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
            th { background: #0c514b; color: #ffffff; text-align: left; text-transform: uppercase; font-size: 10px; font-weight: 700; border-bottom: 2px solid #94a3b8; }
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
      headStyles: { fillColor: [12, 81, 75], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' } 
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

    if (activeTab === 'product') {
      worksheet['!cols'] = [
        { wch: 8 },  { wch: 15 }, { wch: 30 }, { wch: 20 }, 
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 } 
      ];
    } else if (activeTab === 'category') {
      worksheet['!cols'] = [ { wch: 8 }, { wch: 30 }, { wch: 20 } ];
    } else if (activeTab === 'uom') {
      worksheet['!cols'] = [ { wch: 8 }, { wch: 25 }, { wch: 20 }, { wch: 20 } ];
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

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handlePrint} disabled={loading || filtered.length === 0}><FontAwesomeIcon icon={faPrint} /> Print</button>
          <button className="btn btn-secondary" onClick={handleExportPDF} disabled={loading || filtered.length === 0}><FontAwesomeIcon icon={faFilePdf} /> PDF</button>
          <button className="btn btn-secondary" onClick={handleExportExcel} disabled={loading || filtered.length === 0}><FontAwesomeIcon icon={faFileExcel} /> Excel</button>
        </div>
      </div>

      {/* ==================== FILTERS ==================== */}
      {activeTab === 'product' && (
        <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
            <label className="form-label">Category</label>
            <select className="form-input" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat._id || cat.id} value={cat._id || cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
            <label className="form-label">UOM</label>
            <select className="form-input" value={selectedUom} onChange={(e) => setSelectedUom(e.target.value)}>
              <option value="">All UOMs</option>
              {uoms.map(uom => (
                <option key={uom._id || uom.id} value={uom._id || uom.id}>{uom.name || uom.abbreviation}</option>
              ))}
            </select>
          </div>

          {(selectedCategory || selectedUom) && (
            <button className="btn btn-secondary" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* ==================== TABLE SECTION ==================== */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        
     

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr>
                {columns.map((c, i) => (
                  <th key={i} style={{ ...tableStyles.th, textAlign: i === 0 ? 'center' : 'left', width: i === 0 ? '60px' : 'auto' }}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length} style={tableStyles.emptyCell}>Loading...</td></tr>
              ) : currentRows.length === 0 ? (
                <tr><td colSpan={columns.length} style={tableStyles.emptyCell}>No records found matching your criteria.</td></tr>
              ) : (
                currentRows.map((item, idx) => {
                  const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                  const row = getRow(item, idx);
                  row[0] = serialNumber;

                  const qty = item.quantity ?? 0;
                  const reorderLvl = item.reorderLevel ?? 0;
                  const isLowStock = qty <= reorderLvl;

                  return (
                    <tr 
                      key={item._id || idx} 
                      style={{ borderBottom: '1px solid var(--border-color)' }}
                    >
                      {row.map((cell, colIdx) => {
                        let cellStyle = { ...tableStyles.td, textAlign: colIdx === 0 ? 'center' : 'left' };
                        
                        // Conditionals for Product Tab
                        if (activeTab === 'product') {
                          if (columns[colIdx] === 'Stock Qty') {
                            cellStyle = { ...cellStyle, fontWeight: 'bold', color: isLowStock ? 'var(--danger)' : 'var(--success)' };
                          }
                          if (columns[colIdx] === 'Product Name') {
                            cellStyle = { ...cellStyle, fontWeight: 600 };
                          }
                        }

                        // Conditionals for Category/UOM Tabs
                        if (activeTab !== 'product' && colIdx === 1) {
                          cellStyle = { ...cellStyle, fontWeight: 600 };
                        }

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

export default CatalogueReport;