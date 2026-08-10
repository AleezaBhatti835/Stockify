import { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

const TABS = [
  { key: 'customer', label: 'Customer Accounts' },
  { key: 'supplier', label: 'Supplier Accounts' },
  { key: 'employee', label: 'Employee Accounts' },
];

function AccountReport() {
  const [activeTab, setActiveTab] = useState('customer');

  const [ledgerData, setLedgerData] = useState([]);
  const [dropdownList, setDropdownList] = useState([]); // Holds full account objects (Customers/Suppliers/Employees)
  const [customerTypes, setCustomerTypes] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(false);

  // ================= FILTER STATES =================
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // New Relative Filters
  const [transactionType, setTransactionType] = useState('');
  const [selectedCustomerType, setSelectedCustomerType] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('');

  // ================= PAGINATION =================
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  // Fetch static relative lists once
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/customer-types`)
      .then(res => res.json())
      .then(data => setCustomerTypes(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));

    fetch(`${API_BASE_URL}/api/designations`)
      .then(res => res.json())
      .then(data => setDesignations(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, []);

  // Fetch dropdown list when tab changes
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/${activeTab}s`);
        const data = await res.json();
        setDropdownList(Array.isArray(data) ? data : (data.employees || []));
      } catch (err) {
        console.error('Error fetching dropdown list:', err);
      }
    };
    fetchDropdowns();
    
    // Reset filters on tab change
    clearFilters();
  }, [activeTab]);

  // Fetch ledger data whenever tab or basic filters change
  useEffect(() => {
    fetchLedgerData();
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedAccountId, fromDate, toDate]);

  const fetchLedgerData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedAccountId) {
        params.append(`${activeTab}Id`, selectedAccountId);
      }
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const res = await fetch(`${API_BASE_URL}/api/${activeTab}-ledger?${params.toString()}`);
      const data = await res.json();
      
      if (data.success) {
        setLedgerData(data.rows || []);
      } else {
        setLedgerData([]);
      }
    } catch (err) {
      console.error('Error fetching ledger data:', err);
      setLedgerData([]);
    } finally {
      setLoading(false);
    }
  };

  // ================= HELPERS =================
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const clearFilters = () => {
    setSelectedAccountId('');
    setFromDate('');
    setToDate('');
    setTransactionType('');
    setSelectedCustomerType('');
    setSelectedDesignation('');
    setCurrentPage(1);
  };

  // Extract unique transaction types for the dropdown
  const uniqueTransactionTypes = useMemo(() => {
    const types = new Set(ledgerData.map(r => r.transactionType).filter(Boolean));
    return Array.from(types);
  }, [ledgerData]);

  // Apply relative frontend filters (Transaction Type, Customer Type, Designation)
  const filteredLedger = useMemo(() => {
    return ledgerData.filter(row => {
      // 1. Transaction Type Filter
      if (transactionType && row.transactionType !== transactionType) return false;

      // Map to full account details to check relations
      let accountId = '';
      if (activeTab === 'customer') accountId = row.customer?._id || row.customer;
      else if (activeTab === 'supplier') accountId = row.supplier?._id || row.supplier;
      else if (activeTab === 'employee') accountId = row.employee?._id || row.employee;

      const fullAccount = dropdownList.find(acc => acc._id === accountId);

      // 2. Customer Type Filter
      if (activeTab === 'customer' && selectedCustomerType) {
        const cTypeId = fullAccount?.customerTypeId?._id || fullAccount?.customerTypeId;
        if (cTypeId !== selectedCustomerType) return false;
      }

      // 3. Designation Filter
      if (activeTab === 'employee' && selectedDesignation) {
        const desigId = fullAccount?.designation?._id || fullAccount?.designation;
        if (desigId !== selectedDesignation) return false;
      }

      return true;
    });
  }, [ledgerData, transactionType, selectedCustomerType, selectedDesignation, dropdownList, activeTab]);

  const columns = useMemo(() => {
    if (activeTab === 'customer') return ['Sr#', 'Date', 'Ref / Invoice No.', 'Customer Name', 'Customer Type', 'Transaction Type', 'Debit (+)', 'Credit (-)', 'Balance'];
    if (activeTab === 'supplier') return ['Sr#', 'Date', 'Ref / Invoice No.', 'Supplier Name', 'Company', 'Transaction Type', 'Debit (+)', 'Credit (-)', 'Balance'];
    if (activeTab === 'employee') return ['Sr#', 'Date', 'Ref / Invoice No.', 'Employee Name', 'Designation', 'Transaction Type', 'Debit (+)', 'Credit (-)', 'Balance'];
    return [];
  }, [activeTab]);

  const getRow = (row, idx) => {
    let accountId = '';
    let accName = '—';
    let extraCol = '—';

    // Extract names and relations matching the dropdownList
    if (activeTab === 'customer') {
      accountId = row.customer?._id || row.customer;
      const fullAcc = dropdownList.find(acc => acc._id === accountId);
      accName = fullAcc?.name || fullAcc?.customerName || row.customer?.name || '—';
      extraCol = fullAcc?.customerTypeId?.name || '—';
    } else if (activeTab === 'supplier') {
      accountId = row.supplier?._id || row.supplier;
      const fullAcc = dropdownList.find(acc => acc._id === accountId);
      accName = fullAcc?.contactPerson || fullAcc?.name || row.supplier?.contactPerson || '—';
      extraCol = fullAcc?.companyName || row.supplier?.companyName || '—';
    } else if (activeTab === 'employee') {
      accountId = row.employee?._id || row.employee;
      const fullAcc = dropdownList.find(acc => acc._id === accountId);
      accName = fullAcc?.name || row.employee?.name || '—';
      extraCol = fullAcc?.designation?.designation || fullAcc?.designation?.name || '—';
    }

    return [
      idx + 1,
      formatDate(row.date),
      row.invoiceNumber || '—',
      accName,
      extraCol,
      row.transactionType || '—',
      formatCurrency(row.debit),
      formatCurrency(row.credit),
      formatCurrency(row.net)
    ];
  };

  const activeTabLabel = TABS.find(t => t.key === activeTab)?.label || '';

  // ==================== PRINT ====================
  const handlePrint = () => {
    const rowsHtml = filteredLedger.map((item, idx) => {
      const row = getRow(item, idx);
      return `<tr>
        <td style="text-align:center; width:40px;">${row[0]}</td>
        <td style="width:70px;">${row[1]}</td>
        <td style="width:90px;">${row[2]}</td>
        <td style="width:130px; font-weight:600;">${row[3]}</td>
        <td style="width:110px;">${row[4]}</td>
        <td style="width:100px;">${row[5]}</td>
        <td style="width:80px; text-align:left; color:#ef4444;">${row[6]}</td>
        <td style="width:80px; text-align:left; color:#16a34a;">${row[7]}</td>
        <td style="width:90px; text-align:left; font-weight:bold;">${row[8]}</td>
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
            th.left { text-align: left; }
            tr:nth-child(even) { background-color: #f8fafc; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <h2>${activeTabLabel} Ledger</h2>
              <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
            <p><strong>Total Transactions:</strong> ${filteredLedger.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:40px; text-align:center;">Sr#</th>
                <th style="width:70px;">Date</th>
                <th style="width:90px;">Ref No.</th>
                <th style="width:130px;">Account Name</th>
                <th style="width:110px;">${activeTab === 'supplier' ? 'Company' : (activeTab === 'customer' ? 'Customer Type' : 'Designation')}</th>
                <th style="width:100px;">Transaction Type</th>
                <th class="left" style="width:80px;">Debit (+)</th>
                <th class="left" style="width:80px;">Credit (-)</th>
                <th class="left" style="width:90px;">Balance</th>
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
    doc.text(`${activeTabLabel} Ledger`, 14, 12);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on ${new Date().toLocaleString()} — ${filteredLedger.length} transaction(s)`, 14, 18);

    autoTable(doc, {
      startY: 22,
      head: [columns],
      body: filteredLedger.map((item, idx) => getRow(item, idx)),
      styles: { fontSize: 9, cellPadding: 4, lineColor: [203, 213, 225], lineWidth: 0.1 },
      headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        6: { halign: 'left', textColor: [220, 38, 38] },
        7: { halign: 'left', textColor: [22, 163, 74] },
        8: { halign: 'left', fontStyle: 'bold' }
      }
    });
    doc.save(`${activeTab}-ledger-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ==================== EXCEL EXPORT ====================
  const handleExportExcel = () => {
    const rows = filteredLedger.map((item, idx) => {
      const obj = {};
      const row = getRow(item, idx);
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Setting optimal column widths
    worksheet['!cols'] = [
      { wch: 6 },   // Sr#
      { wch: 12 },  // Date
      { wch: 15 },  // Ref No
      { wch: 25 },  // Account Name
      { wch: 20 },  // Extra Col (Type/Company/Designation)
      { wch: 20 },  // Transaction Type
      { wch: 15 },  // Debit
      { wch: 15 },  // Credit
      { wch: 18 }   // Balance
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ledger');
    XLSX.writeFile(workbook, `${activeTab}-ledger-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ================= PAGINATION =================
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRows = filteredLedger.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLedger.length / itemsPerPage);

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
        {/* Universal Filters */}
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Select Account</label>
          <select 
            style={styles.filterInput} 
            value={selectedAccountId} 
            onChange={(e) => setSelectedAccountId(e.target.value)}
          >
            <option value="">All Accounts</option>
            {dropdownList.map(item => {
               let label = '';
               if (activeTab === 'customer') label = item.name || item.customerName;
               else if (activeTab === 'supplier') label = item.companyName || item.contactPerson;
               else if (activeTab === 'employee') label = item.name;
               return <option key={item._id} value={item._id}>{label || 'Unnamed'}</option>
            })}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Transaction Type</label>
          <select 
            style={styles.filterInput} 
            value={transactionType} 
            onChange={(e) => setTransactionType(e.target.value)}
          >
            <option value="">All Types</option>
            {uniqueTransactionTypes.map((type, i) => (
               <option key={i} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Relative Filter: Customer Type */}
        {activeTab === 'customer' && (
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Customer Type</label>
            <select 
              style={styles.filterInput} 
              value={selectedCustomerType} 
              onChange={(e) => setSelectedCustomerType(e.target.value)}
            >
              <option value="">All Customer Types</option>
              {customerTypes.map(type => (
                 <option key={type._id} value={type._id}>{type.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Relative Filter: Employee Designation */}
        {activeTab === 'employee' && (
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Designation</label>
            <select 
              style={styles.filterInput} 
              value={selectedDesignation} 
              onChange={(e) => setSelectedDesignation(e.target.value)}
            >
              <option value="">All Designations</option>
              {designations.map(desig => (
                 <option key={desig._id} value={desig._id}>{desig.designation || desig.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Date Filters */}
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
        Showing {currentRows.length} of {filteredLedger.length} transaction(s)
      </div>

      {/* ==================== TABLE ==================== */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={i} style={{ ...styles.th, textAlign: i === 0 ? 'center' : (i >= 6 ? 'left' : 'left'), width: i === 0 ? '50px' : 'auto' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} style={styles.emptyCell}>Loading ledger data...</td></tr>
            ) : currentRows.length === 0 ? (
              <tr><td colSpan={columns.length} style={styles.emptyCell}>No transactions found for the selected filters.</td></tr>
            ) : (
              currentRows.map((item, idx) => {
                const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                const row = getRow(item, idx);
                row[0] = serialNumber;

                return (
                  <tr key={item._id || idx} style={idx % 2 === 1 ? styles.altRow : null}>
                    {row.map((cell, colIdx) => {
                      let cellStyle = { ...styles.td, textAlign: colIdx === 0 ? 'center' : (colIdx >= 6 ? 'left' : 'left') };
                      if (colIdx === 6) cellStyle = { ...cellStyle, fontWeight: 600 };
                      if (colIdx === 6 && item.debit > 0) cellStyle = { ...cellStyle, color: '#ef4444' }; // Red Debit
                      if (colIdx === 9 && item.credit > 0) cellStyle = { ...cellStyle, color: '#16a34a' }; // Green Credit
                      if (colIdx === 9) cellStyle = { ...cellStyle, fontWeight: 'bold', color: '#0f172a' }; // Bold Balance
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
      {filteredLedger.length > itemsPerPage && (
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
  page: { padding: '24px 6px', width: '100%', boxSizing: 'border-box', background: '#f8fafc', minHeight: '100vh', marginBottom: '60px' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' },
  actionBtn: { color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },

  tabContainer: { display: 'flex', gap: '10px', flexWrap: 'wrap', width: '100%', alignItems: 'center' },
  tab: { padding: '10px 18px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s ease-in-out' },
  activeTab: { padding: '10px 18px', borderRadius: '6px', border: '1px solid #3c4e6b', backgroundColor: '#3c4e6b', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s ease-in-out' },

  filterRow: { marginTop: '10px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' },
  filterGroup: { display: 'flex', flexDirection: 'column', minWidth: '70px', maxWidth: '220px', flex: 1 },
  filterLabel: { fontSize: '11px', fontWeight: 500, color: '#475569', textAlign: 'left' },
  filterInput: { color: '#343a42', padding: '6.4px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' },
  clearFilterBtn: { padding: '10px 18px', background: '#6c757d', color: '#f9f9f9', border: '1px solid #cfcece', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' },

  tableWrapper: { marginTop: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', width: '100%' },
  table: { width: '95%', borderCollapse: 'collapse', tableLayout: 'auto' },
  th: { padding: '12px 14px', background: '#3c4e6b', fontSize: '11px', color: '#fefefe', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #94a3b8', borderRight: '1px solid #44576e', whiteSpace: 'nowrap' },
  td: { padding: '10px 14px', fontSize: '13px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', color: '#334155', whiteSpace: 'nowrap' },
  altRow: { backgroundColor: '#f8fafc' },
  emptyCell: { textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '14px' },
};

export default AccountReport;