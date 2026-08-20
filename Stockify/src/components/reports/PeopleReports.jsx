import { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

const TABS = [
  { key: 'customer', label: 'Customer Report' },
  { key: 'employee', label: 'Employee Report' },
  { key: 'supplier', label: 'Supplier Report' },
];

function PeopleReport() {
  const [activeTab, setActiveTab] = useState('customer');

  const [customers, setCustomers] = useState([]);
  const [customerTypes, setCustomerTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedType, setSelectedType] = useState(''); 

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    setSelectedType('');
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedType]);

  // CORE ARCHITECTURE: Unified multi-endpoint data aggregation to populate cross-entity people reports simultaneously.
  const fetchAll = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [custRes, typeRes, empRes, desigRes, supRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/customers`, { headers }),
        fetch(`${API_BASE_URL}/api/customer-types`, { headers }),
        fetch(`${API_BASE_URL}/api/employees`, { headers }),
        fetch(`${API_BASE_URL}/api/designations`, { headers }),
        fetch(`${API_BASE_URL}/api/suppliers`, { headers }),
      ]);
      const [custData, typeData, empData, desigData, supData] = await Promise.all([
        custRes.json(), typeRes.json(), empRes.json(), desigRes.json(), supRes.json()
      ]);
      
      setCustomers(Array.isArray(custData) ? custData : []);
      setCustomerTypes(Array.isArray(typeData) ? typeData : []);
      setEmployees(Array.isArray(empData) ? empData : (empData.employees || []));
      setDesignations(Array.isArray(desigData) ? desigData : []);
      setSuppliers(Array.isArray(supData) ? supData : []);
    } catch (err) {
      console.error('Error fetching people data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEntityDate = (e) => {
    if (!e) return null;
    const fields = ['createdAt', 'created_at', 'createdDate', 'date', 'joinDate', 'joiningDate', 'hireDate', 'addedAt', 'addedDate', 'registrationDate'];
    for (const f of fields) {
      if (e[f]) {
        const d = new Date(e[f]);
        if (!isNaN(d.getTime())) return d;
      }
    }
    if (e._id && typeof e._id === 'string' && e._id.length === 24) {
      const timestamp = parseInt(e._id.substring(0, 8), 16) * 1000;
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  };

  const formatEntityDate = (e) => {
    const d = getEntityDate(e);
    return d ? d.toLocaleDateString('en-GB') : '—';
  };

  const getCustomerTypeName = (c) => {
    const t = c.customerTypeId;
    if (!t) return '—';
    return typeof t === 'object' ? (t.name || '—') : t;
  };
  const getCustomerTypeId = (c) => {
    const t = c.customerTypeId;
    if (!t) return '';
    return typeof t === 'object' ? t._id : t;
  };

  const getEmployeeName = (e) => e.name || e.fullName || e.employeeName || '—';
  const getDesignation = (e) => {
    const d = e.designation || e.role;
    if (!d) return '—';
    return typeof d === 'object' ? (d.designation || d.name || d.title || '—') : d;
  };
  const getDesignationId = (e) => {
    const d = e.designation || e.role;
    if (!d) return '';
    return typeof d === 'object' ? d._id : d;
  };

  const getSupplierName = (s) => s.companyName || s.name || s.supplierName || '—';
  const getContactPerson = (s) => s.contactPerson || s.contactName || '—';

  const filtered = useMemo(() => {
    let result = [];

    if (activeTab === 'customer') {
      result = [...customers];
      if (selectedType) result = result.filter(c => getCustomerTypeId(c) === selectedType);
    } else if (activeTab === 'employee') {
      result = [...employees];
      if (selectedType) result = result.filter(e => getDesignationId(e) === selectedType);
    } else {
      result = [...suppliers];
    }

    result.sort((a, b) => {
      const dateA = getEntityDate(a);
      const dateB = getEntityDate(b);
      if (dateA && dateB) return dateA - dateB;
      if (dateA && !dateB) return -1;
      if (!dateA && dateB) return 1;
      return 0;
    });

    return result;
  }, [activeTab, customers, employees, suppliers, selectedType]);

  const clearFilters = () => {
    setSelectedType('');
  };

  const columns = useMemo(() => {
    if (activeTab === 'customer') return ['Sr#', 'Date Created', 'Customer Name', 'Customer Type', 'Email', 'CNIC', 'Contact'];
    if (activeTab === 'employee') return ['Sr#', 'Date Created', 'Employee Name', 'Designation', 'Email', 'Contact', 'CNIC'];
    return ['Sr#', 'Date Created', 'Company Name', 'Name', 'Email', 'Contact'];
  }, [activeTab]);

  const getRow = (item, idx) => {
    if (activeTab === 'customer') {
      return [idx + 1, formatEntityDate(item), item.name || item.customerName || '—', getCustomerTypeName(item), item.email || '—', item.cnic || '—', item.contact || '—'];
    }
    if (activeTab === 'employee') {
      return [idx + 1, formatEntityDate(item), getEmployeeName(item), getDesignation(item), item.email || '—', item.contact || item.phone || '—', item.cnic || '—'];
    }
    return [idx + 1, formatEntityDate(item), getSupplierName(item), getContactPerson(item), item.email || '—', item.contact || item.phone || '—'];
  };

  const activeTabLabel = TABS.find(t => t.key === activeTab)?.label || '';

  // DATA EXPORT ENGINE: Automated document generation logic outputting raw data to PDF, Excel, and structured iframe printing formats.
  const handlePrint = () => {
    const rowsHtml = filtered.map((item, idx) => {
      const row = getRow(item, idx);
      return `<tr>${row.map((cell, i) => `<td style="${i === 0 ? 'text-align:center;' : ''} word-break: break-word;">${cell}</td>`).join('')}</tr>`;
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
            <thead><tr>${columns.map(c => `<th style="${c === 'Sr#' ? 'width: 40px; text-align: center;' : ''}">${c}</th>`).join('')}</tr></thead>
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
    });
    doc.save(`${activeTab}-report-${new Date().toISOString().slice(0, 10)}.pdf`);
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
      { wch: 8 },   
      { wch: 15 },  
      { wch: 25 },  
      { wch: 20 },  
      { wch: 30 },  
      { wch: 18 },  
      { wch: 18 }   
    ];

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

      {/* FILTER BAR (Conditionally Rendered) */}
      {(activeTab === 'customer' || activeTab === 'employee') && (
        <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
          
          {activeTab === 'customer' && (
            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
              <label className="form-label">Customer Type</label>
              <select className="form-input" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                <option value="">All Types</option>
                {customerTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>
          )}

          {activeTab === 'employee' && (
            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
              <label className="form-label">Designation</label>
              <select className="form-input" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                <option value="">All Designations</option>
                {designations.map(d => <option key={d._id} value={d._id}>{d.designation || d.name}</option>)}
              </select>
            </div>
          )}

          <button className="btn btn-secondary" onClick={clearFilters}>Clear Filters</button>
        </div>
      )}

      {/* DATA TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Showing {currentRows.length} of {filtered.length} record(s)
          </span>
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
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
                <tr><td colSpan={columns.length} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>Loading reports...</td></tr>
              ) : currentRows.length === 0 ? (
                <tr><td colSpan={columns.length} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No records found matching your filters.</td></tr>
              ) : (
                currentRows.map((item, idx) => {
                  const serialNumber = indexOfFirstItem + idx + 1;
                  const row = getRow(item, idx);
                  row[0] = serialNumber;

                  return (
                    <tr 
                      key={item._id || idx} 
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
                            color: colIdx === 2 || colIdx === 3 ? 'var(--text-main)' : 'var(--text-muted)',
                            fontWeight: colIdx === 2 ? '500' : '400',
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

export default PeopleReport;