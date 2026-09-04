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
  { key: 'labour', label: 'Labour Accounts' },
  { key: 'transporter', label: 'Transporter Accounts' },
];

function AccountReport() {
  const [activeTab, setActiveTab] = useState('customer');

  const [ledgerData, setLedgerData] = useState([]);
  const [dropdownList, setDropdownList] = useState([]); 
  const [customerTypes, setCustomerTypes] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  const [transactionType, setTransactionType] = useState('');
  const [selectedCustomerType, setSelectedCustomerType] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE_URL}/api/customer-types`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setCustomerTypes(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));

    fetch(`${API_BASE_URL}/api/designations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setDesignations(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const token = localStorage.getItem('token');
        
        let endpoint = `${activeTab}s`;
        if (activeTab === 'labour') {
          endpoint = 'labour';
        }

        const res = await fetch(`${API_BASE_URL}/api/${endpoint}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        let list = [];
        if (Array.isArray(data)) list = data;
        else if (data.data && Array.isArray(data.data)) list = data.data;
        else if (data.employees && Array.isArray(data.employees)) list = data.employees;
        
        setDropdownList(list);
      } catch (err) {
        console.error('Error fetching dropdown list:', err);
        setDropdownList([]);
      }
    };
    fetchDropdowns();
    clearFilters();
  }, [activeTab]);

  useEffect(() => {
    fetchLedgerData();
    setCurrentPage(1);
  }, [activeTab, selectedAccountId, fromDate, toDate]);

  const fetchLedgerData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (selectedAccountId) {
        params.append(`${activeTab}Id`, selectedAccountId);
      }
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const res = await fetch(`${API_BASE_URL}/api/${activeTab}-ledger?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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

  const uniqueTransactionTypes = useMemo(() => {
    const types = new Set(ledgerData.map(r => r.transactionType).filter(Boolean));
    return Array.from(types);
  }, [ledgerData]);

  const filteredLedger = useMemo(() => {
    return ledgerData.filter(row => {
      if (transactionType && row.transactionType !== transactionType) return false;

  let accountId = '';
      if (activeTab === 'customer') accountId = row.customer?._id || row.customer;
      else if (activeTab === 'supplier') accountId = row.supplier?._id || row.supplier;
      else if (activeTab === 'employee') accountId = row.employee?._id || row.employee;
      else if (activeTab === 'labour') accountId = row.labour?._id || row.labour;
      else if (activeTab === 'transporter') accountId = row.transporter?._id || row.transporter;
      const fullAccount = dropdownList.find(acc => acc._id === accountId);

      if (activeTab === 'customer' && selectedCustomerType) {
        const cTypeId = fullAccount?.customerTypeId?._id || fullAccount?.customerTypeId;
        if (cTypeId !== selectedCustomerType) return false;
      }

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
    if (activeTab === 'labour') return ['Sr#', 'Date', 'Ref / Invoice No.', 'Labour Name', 'Phone', 'Transaction Type', 'Debit (+)', 'Credit (-)', 'Balance'];
    if (activeTab === 'transporter') return ['Sr#', 'Date', 'Ref / Invoice No.', 'Transporter Name', 'Company', 'Transaction Type', 'Debit (+)', 'Credit (-)', 'Balance'];
    return [];
  }, [activeTab]);

const getRow = (row, idx) => {
    let accountId = '';
    let accName = '—';
    let extraCol = '—';

    if (activeTab === 'customer') {
      accountId = row.customer?._id || row.customer;
      const fullAcc = dropdownList.find(acc => String(acc._id) === String(accountId));
      accName = fullAcc?.name || fullAcc?.customerName || row.customer?.name || '—';
      extraCol = fullAcc?.customerTypeId?.name || '—';
    } else if (activeTab === 'supplier') {
      accountId = row.supplier?._id || row.supplier;
      const fullAcc = dropdownList.find(acc => String(acc._id) === String(accountId));
      accName = fullAcc?.contactPerson || fullAcc?.name || row.supplier?.contactPerson || '—';
      extraCol = fullAcc?.companyName || row.supplier?.companyName || '—';
    } else if (activeTab === 'employee') {
      accountId = row.employee?._id || row.employee;
      const fullAcc = dropdownList.find(acc => String(acc._id) === String(accountId));
      accName = fullAcc?.name || row.employee?.name || '—';
      extraCol = fullAcc?.designation?.designation || fullAcc?.designation?.name || '—';
    } else if (activeTab === 'labour') {
      accountId = row.labour?._id || row.labour;
      const fullAcc = dropdownList.find(acc => String(acc._id) === String(accountId));
      accName = fullAcc?.name || row.labour?.name || '—';
      extraCol = fullAcc?.contact || fullAcc?.phoneNumber || row.labour?.phone || '—';
    } else if (activeTab === 'transporter') {
      accountId = row.transporter?._id || row.transporter;
      const fullAcc = dropdownList.find(acc => String(acc._id) === String(accountId));
      accName = fullAcc?.name || row.transporter?.name || '—';
      extraCol = fullAcc?.phone || fullAcc?.phoneNumber || fullAcc?.companyName || row.transporter?.phone || '—';
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

  const handleExportExcel = () => {
    const rows = filteredLedger.map((item, idx) => {
      const obj = {};
      const row = getRow(item, idx);
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 6 },  { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, 
      { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 18 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ledger');
    XLSX.writeFile(workbook, `${activeTab}-ledger-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRows = filteredLedger.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLedger.length / itemsPerPage);

  return (
    <div className="dashboard-wrapper">
      
      {/* TABS & EXPORTS TOP BAR */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap',padding:'13px 3px ', justifyContent: 'space-between', alignItems: 'center', gap: '17px' }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap',padding:'1px' }}>
          {TABS.map(t => (
            <button
            style={{ padding: '10px 8px', fontSize: '13px' }}
              key={t.key}
              className={`btn ${activeTab === t.key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handlePrint}><FontAwesomeIcon icon={faPrint} /> Print</button>
          <button className="btn btn-secondary" onClick={handleExportPDF}><FontAwesomeIcon icon={faFilePdf} /> PDF</button>
          <button className="btn btn-secondary" onClick={handleExportExcel}><FontAwesomeIcon icon={faFileExcel} /> Excel</button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 130px' }}>
          <label className="form-label">Select Account</label>
          <select className="form-input" value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)}>
            <option value="">All Accounts</option>
            {dropdownList.map(item => {
               let label = '';
               if (activeTab === 'customer') label = item.name || item.customerName;
               else if (activeTab === 'supplier') label = item.companyName || item.contactPerson;
               else if (activeTab === 'employee') label = item.name;
               else if (activeTab === 'labour') label = item.name; // 💡 Labour name
               else if (activeTab === 'transporter') label = item.name;
               return <option key={item._id} value={item._id}>{label || 'Unnamed'}</option>
            })}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 130px' }}>
          <label className="form-label">Transaction Type</label>
          <select className="form-input" value={transactionType} onChange={(e) => setTransactionType(e.target.value)}>
            <option value="">All Types</option>
            {uniqueTransactionTypes.map((type, i) => (
               <option key={i} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {activeTab === 'customer' && (
          <div className="form-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
            <label className="form-label">Customer Type</label>
            <select className="form-input" value={selectedCustomerType} onChange={(e) => setSelectedCustomerType(e.target.value)}>
              <option value="">All Customer Types</option>
              {customerTypes.map(type => (
                 <option key={type._id} value={type._id}>{type.name}</option>
              ))}
            </select>
          </div>
        )}

        {activeTab === 'employee' && (
          <div className="form-group" style={{ marginBottom: 0, flex: '1 1 180px' }}>
            <label className="form-label">Designation</label>
            <select className="form-input" value={selectedDesignation} onChange={(e) => setSelectedDesignation(e.target.value)}>
              <option value="">All Designations</option>
              {designations.map(desig => (
                 <option key={desig._id} value={desig._id}>{desig.designation || desig.name}</option>
              ))}
            </select>
          </div>
        )}

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

      {/* TABLE SECTION */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--header)' }}>
                {columns.map((c, i) => (
                  <th key={i} style={{ padding: '12px 16px', color: 'white', textAlign: i === 0 ? 'center' : 'left', fontSize: '13px', fontWeight: '600' }}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>Loading ledger data...</td></tr>
              ) : currentRows.length === 0 ? (
                <tr><td colSpan={columns.length} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No transactions found for the selected filters.</td></tr>
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
                            color: colIdx === 6 && item.debit > 0 ? 'var(--danger)' : (colIdx === 7 && item.credit > 0 ? 'var(--success)' : (colIdx === 8 ? 'var(--text-main)' : 'var(--text-main)')),
                            fontWeight: colIdx === 8 ? '700' : (colIdx === 6 || colIdx === 7 ? '600' : '400'),
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

        {filteredLedger.length > itemsPerPage && (
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

export default AccountReport;