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

  const [stockStatus, setStockStatus] = useState(''); 
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedUom, setSelectedUom] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  useEffect(() => {
    fetchData();
  }, []);

  // CORE ARCHITECTURE: Concurrent asynchronous retrieval of inventory products, categories, and UOM catalogs for advanced stock state reporting.
  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [prodRes, catRes, uomRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/products`, { headers }),
        fetch(`${API_BASE_URL}/api/categories`, { headers }),
        fetch(`${API_BASE_URL}/api/uoms`, { headers }),
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

  const filtered = useMemo(() => {
    let result = [...products];

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

    if (selectedCategory) {
      result = result.filter(p => getCategoryId(p) === selectedCategory);
    }

    if (selectedUom) {
      result = result.filter(p => getUomId(p) === selectedUom);
    }

    return result;
  }, [products, stockStatus, selectedCategory, selectedUom]);

  useEffect(() => {
    setCurrentPage(1);
  }, [stockStatus, selectedCategory, selectedUom]);

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedUom('');
  };

  const columns = ['Sr#', 'Date', 'Product Name', 'Category', 'UOM', 'Qty Available', 'Reorder Level', 'Expiry Date'];

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

  // DATA EXPORT ENGINE: Automated document generation logic rendering structured print buffers, custom PDF vectors, and formatted spreadsheets.
  const handlePrint = () => {
    const rowsHtml = filtered.map((p, idx) => {
      const qty = p.quantity || p.stockQuantity || 0;
      const reorderLvl = p.reorderLevel || 0;
      const isLowStock = qty <= reorderLvl;

      let expiryStyle = '';
      if (p.expiryDate && new Date(p.expiryDate) < new Date()) {
        expiryStyle = 'color: var(--danger); font-weight: bold;';
      }

      return `
      <tr>
        <td style="text-align: center; width: 40px;">${idx + 1}</td>
        <td style="width: 80px;">${formatDate(p.createdAt || p.date)}</td>
        <td style="width: 150px; font-weight: bold;">${p.name || '—'}</td>
        <td style="width: 100px;">${getCategoryName(p)}</td>
        <td style="width: 60px;">${getUOM(p)}</td>
        <td style="width: 90px; font-weight: bold; color: ${isLowStock ? 'var(--danger)' : 'var(--success)'};">${qty}</td>
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

    worksheet['!cols'] = [
      { wch: 5 },  
      { wch: 12 }, 
      { wch: 30 }, 
      { wch: 20 }, 
      { wch: 15 }, 
      { wch: 15 }, 
      { wch: 15 }, 
      { wch: 15 }, 
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock');
    XLSX.writeFile(workbook, `stock-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div className="dashboard-wrapper">
      
      {/* TABS & EXPORTS TOP BAR */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className={`btn ${stockStatus === '' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStockStatus('')}>
            All Stock
          </button>
          <button className={`btn ${stockStatus === 'in_stock' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStockStatus('in_stock')}>
            Available Stock
          </button>
          <button className={`btn ${stockStatus === 'reorder' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStockStatus('reorder')}>
            Reorder Stock
          </button>
          <button className={`btn ${stockStatus === 'expired' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStockStatus('expired')}>
            Expired Stock
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handlePrint} disabled={loading || filtered.length === 0}><FontAwesomeIcon icon={faPrint} /> Print</button>
          <button className="btn btn-secondary" onClick={handleExportPDF} disabled={loading || filtered.length === 0}><FontAwesomeIcon icon={faFilePdf} /> PDF</button>
          <button className="btn btn-secondary" onClick={handleExportExcel} disabled={loading || filtered.length === 0}><FontAwesomeIcon icon={faFileExcel} /> Excel</button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
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

        <button className="btn btn-secondary" onClick={clearFilters}>Clear Filters</button>
      </div>

      {/* DATA TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--header)' }}>
                {columns.map((c, i) => (
                  <th key={i} style={{ padding: '12px 16px', color: 'white', textAlign: i === 0 ? 'left' : 'left', fontSize: '13px', fontWeight: '600', width: i === 0 ? '60px' : 'auto' }}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</td></tr>
              ) : currentProducts.length === 0 ? (
                <tr><td colSpan={columns.length} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No stock records found matching your filters.</td></tr>
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
                    <tr 
                      key={p._id || idx} 
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s',textAlign:'left' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'center' }}>{serialNumber}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>{formatDate(p.createdAt || p.date)}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', fontWeight: '500' }}>{p.name || '—'}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)' }}>{getCategoryName(p)}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)' }}>{getUOM(p)}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: isLowStock ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                        {qty}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)' }}>{reorderLvl}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: isExpired ? 'var(--danger)' : 'var(--text-main)', fontWeight: isExpired ? 'bold' : 'normal' }}>
                        {formatDate(p.expiryDate)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {filtered.length > itemsPerPage && (
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
            <button className="btn btn-secondary" disabled={currentPage <= 1} onClick={() => setCurrentPage(prev => prev - 1)} style={{ padding: '6px 12px' }}>
              ←
            </button>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
              Page {currentPage} of {totalPages || 1}
            </span>
            <button className="btn btn-secondary" disabled={currentPage >= totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} style={{ padding: '6px 12px' }}>
              →
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

export default StockReport;