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

  const [selectedProduct, setSelectedProduct] = useState('');
  const [movementType, setMovementType] = useState(''); 
  const [referenceType, setReferenceType] = useState(''); 
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  useEffect(() => {
    fetchData();
  }, []);

  // CORE ARCHITECTURE: Synchronous multi-resource data retrieval engine fetching stock movements and inventory catalogs concurrently.
  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [movRes, prodRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/stock-movements`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/products`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
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

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProduct, movementType, referenceType, fromDate, toDate]);

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

  const uniqueRefTypes = useMemo(() => {
    const types = new Set(movements.map(m => m.referenceType).filter(Boolean));
    return Array.from(types);
  }, [movements]);

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

  // DATA EXPORT ENGINE: Automated multi-format export utility converting filter datasets into printable HTML documents, native PDF vectors, and formatted spreadsheets.
  const handlePrint = () => {
    const rowsHtml = filtered.map((item, idx) => {
      const row = getRow(item, idx);
      const isIN = row[3] === 'IN';
      const isOUT = row[3] === 'OUT';
      
      let typeStyle = '';
      if (isIN) typeStyle = 'color: var(--success); font-weight: bold;';
      if (isOUT) typeStyle = 'color: var(--danger); font-weight: bold;';

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
          if (type === 'IN') data.cell.styles.textColor = [16, 185, 129];
          if (type === 'OUT') data.cell.styles.textColor = [225, 29, 72];
        }
      }
    });
    doc.save(`stock-movement-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleExportExcel = () => {
    const rows = filtered.map((item, idx) => {
      const obj = {};
      const row = getRow(item, idx);
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet['!cols'] = [
      { wch: 6 },  
      { wch: 12 }, 
      { wch: 35 }, 
      { wch: 18 }, 
      { wch: 12 }, 
      { wch: 20 }, 
      { wch: 40 }  
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Movements');
    XLSX.writeFile(workbook, `stock-movements-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRows = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div className="dashboard-wrapper">
      
      {/* HEADER ACTIONS TOP BAR */}
      <div className="card" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button className="btn btn-secondary" onClick={handlePrint} disabled={loading || filtered.length === 0}><FontAwesomeIcon icon={faPrint} /> Print</button>
        <button className="btn btn-secondary" onClick={handleExportPDF} disabled={loading || filtered.length === 0}><FontAwesomeIcon icon={faFilePdf} /> PDF</button>
        <button className="btn btn-secondary" onClick={handleExportExcel} disabled={loading || filtered.length === 0}><FontAwesomeIcon icon={faFileExcel} /> Excel</button>
      </div>

      {/* FILTER BAR */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
          <label className="form-label">Select Product</label>
          <select 
            className="form-input"
            value={selectedProduct} 
            onChange={(e) => setSelectedProduct(e.target.value)}
          >
            <option value="">All Products</option>
            {products.map(p => (
               <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 160px' }}>
          <label className="form-label">Movement Type</label>
          <select 
            className="form-input"
            value={movementType} 
            onChange={(e) => setMovementType(e.target.value)}
          >
            <option value="">All (IN/OUT)</option>
            <option value="IN">Stock IN (+)</option>
            <option value="OUT">Stock OUT (-)</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 180px' }}>
          <label className="form-label">Reference (Source)</label>
          <select 
            className="form-input"
            value={referenceType} 
            onChange={(e) => setReferenceType(e.target.value)}
          >
            <option value="">All Sources</option>
            {uniqueRefTypes.map((type, i) => (
               <option key={i} value={type}>{type}</option>
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
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Showing {currentRows.length} of {filtered.length} record(s)
          </span>
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--header)' }}>
                {columns.map((c, i) => (
                  <th key={i} style={{ padding: '12px 16px', color: 'white', textAlign: i === 0 ? 'center' : 'left', fontSize: '13px', fontWeight: '600', width: i === 0 ? '60px' : 'auto' }}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>Loading stock movements...</td></tr>
              ) : currentRows.length === 0 ? (
                <tr><td colSpan={columns.length} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No stock movements found.</td></tr>
              ) : (
                currentRows.map((item, idx) => {
                  const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                  const row = getRow(item, idx);
                  row[0] = serialNumber;

                  const isIN = item.movementType === 'IN';
                  const isOUT = item.movementType === 'OUT';

                  return (
                    <tr 
                      key={item._id || idx} 
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {row.map((cell, colIdx) => {
                        let cellStyle = { 
                          padding: '10px 16px', 
                          fontSize: '13px', 
                          color: 'var(--text-main)',
                          textAlign: colIdx === 0 ? 'center' : 'left' 
                        };
                        
                        if (colIdx === 2) cellStyle.fontWeight = 500;
                        if ((colIdx === 3 || colIdx === 4) && isIN) {
                          cellStyle.color = 'var(--success)';
                          cellStyle.fontWeight = '700';
                        }
                        if ((colIdx === 3 || colIdx === 4) && isOUT) {
                          cellStyle.color = 'var(--danger)';
                          cellStyle.fontWeight = '700';
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

export default StockMovementReport;