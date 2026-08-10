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

  // ================= FILTER STATES =================
  const [selectedType, setSelectedType] = useState(''); // customer type / designation

  // ================= PAGINATION =================
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

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [custRes, typeRes, empRes, desigRes, supRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/customers`),
        fetch(`${API_BASE_URL}/api/customer-types`),
        fetch(`${API_BASE_URL}/api/employees`),
        fetch(`${API_BASE_URL}/api/designations`),
        fetch(`${API_BASE_URL}/api/suppliers`),
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

  // ================= GENERIC DATE HELPER (handles missing createdAt via _id fallback) =================
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

  // ================= CUSTOMER HELPERS =================
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

  // ================= EMPLOYEE HELPERS =================
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

  // ================= SUPPLIER HELPERS =================
  const getSupplierName = (s) => s.companyName || s.name || s.supplierName || '—';
  const getContactPerson = (s) => s.contactPerson || s.contactName || '—';

  // ================= FILTERED DATA PER TAB =================
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

  // ================= COLUMN CONFIG PER TAB =================
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

  // ==================== PRINT ====================
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
            @page { size: A4 portrait; margin: 10mm; }
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

  // ==================== EXCEL EXPORT ====================
  const handleExportExcel = () => {
    const rows = filtered.map((item, idx) => {
      const obj = {};
      const row = getRow(item, idx);
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    
    // Setting optimal column widths for Excel
    worksheet['!cols'] = [
      { wch: 8 },   // Sr#
      { wch: 15 },  // Date Created
      { wch: 25 },  // Name / Company Name
      { wch: 20 },  // Type / Designation / Name
      { wch: 30 },  // Email
      { wch: 18 },  // CNIC / Contact
      { wch: 18 }   // Contact
    ];

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
        {activeTab === 'customer' && (
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Customer Type</label>
            <select style={styles.filterInput} value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              <option value="">All Types</option>
              {customerTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>
        )}

        {activeTab === 'employee' && (
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Designation</label>
            <select style={styles.filterInput} value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              <option value="">All Designations</option>
              {designations.map(d => <option key={d._id} value={d._id}>{d.designation || d.name}</option>)}
            </select>
          </div>
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
                <th key={i} style={{ ...styles.th, textAlign: i === 0 ? 'center' : 'left' }}>{c}</th>
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
                return (
                  <tr key={item._id || idx} style={idx % 2 === 1 ? styles.altRow : null}>
                    {row.map((cell, colIdx) => {
                      let cellStyle = { ...styles.td, textAlign: colIdx === 0 || colIdx === 1 ? 'center' : 'left' };
                      if (colIdx === 2) cellStyle = { ...cellStyle, fontWeight: 600 };
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

export default PeopleReport;