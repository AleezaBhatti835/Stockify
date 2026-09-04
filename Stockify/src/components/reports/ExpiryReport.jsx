import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faPrint, faFilePdf, faFileExcel, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

const ExpiryReport = () => {
    const [days, setDays] = useState(30); // Default next 30 days
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // 💡 Pagination States Added
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    useEffect(() => {
        fetchExpiryReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [days]);

    // 💡 Reset page when data changes
    useEffect(() => {
        setCurrentPage(1);
    }, [reportData]);

    const fetchExpiryReport = async () => {
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/reports/expiring-stock?days=${days}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            
            if (data.success) {
                setReportData(data.data || []);
            } else {
                setMessage(data.message || 'Failed to fetch expiry report.');
            }
        } catch (error) {
            setMessage('Server error while fetching report.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const columns = ['Sr#', 'Product Name', 'Batch Number', 'Qty Left', 'Expiry Date', 'Status'];

    const getRow = (item, idx) => [
        idx + 1,
        item.productName,
        item.batchNumber,
        item.quantity,
        formatDate(item.expiryDate),
        item.status
    ];

    // 💡 Pagination Calculations
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = reportData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(reportData.length / itemsPerPage);

    // 💡 Print Logic Fully Implemented
    const handlePrint = () => {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.top = '-10000px';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow.document;

        let rowsHtml = '';
        reportData.forEach((item, idx) => {
            rowsHtml += `
                <tr>
                    <td style="text-align: center;">${idx + 1}</td>
                    <td>${item.productName}</td>
                    <td>${item.batchNumber}</td>
                    <td style="text-align: center; font-weight: bold; color: #0284c7;">${item.quantity}</td>
                    <td>${formatDate(item.expiryDate)}</td>
                    <td style="font-weight: bold; color: ${item.status === 'Expired' ? '#dc2626' : '#d97706'}">${item.status}</td>
                </tr>
            `;
        });

        doc.open();
        doc.write(`
            <html>
                <head>
                    <style>
                        * { box-sizing: border-box; }
                        @page { size: A4 portrait; margin: 15mm; }
                        body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
                        .header-container { margin-bottom: 15px; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; }
                        h2 { margin: 0; font-size: 20px; text-transform: uppercase; }
                        p { margin: 4px 0 0 0; font-size: 12px; color: #64748b; }
                        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px; }
                        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
                        th { background-color: #1e293b; color: #fff; text-transform: uppercase; font-size: 11px; }
                    </style>
                </head>
                <body>
                    <div class="header-container">
                        <h2>Expiry Report</h2>
                        <p>Showing items expiring within the next ${days} days.</p>
                        <p>Generated on ${new Date().toLocaleString()}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th style="text-align: center; width: 50px;">Sr#</th>
                                <th>Product Name</th>
                                <th>Batch Number</th>
                                <th style="text-align: center;">Qty Left</th>
                                <th>Expiry Date</th>
                                <th>Status</th>
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
    
    const handleExportExcel = () => {
        const rows = reportData.map((item, idx) => {
            const obj = {};
            const row = getRow(item, idx);
            columns.forEach((col, i) => { obj[col] = row[i]; });
            return obj;
        });
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Expiry Report");
        XLSX.writeFile(workbook, `Expiry_Report_Next_${days}_Days.xlsx`);
    };

    return (
        <div className="dashboard-wrapper" style={{ width: '100%', boxSizing: 'border-box' }}>
            
            {/* FILTER BAR */}
            <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ marginBottom: 0, flex: '1 1 300px' }}>
                    <label className="form-label">Show items expiring within:</label>
                    <select className="form-input" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                        <option value={15}>Next 15 Days</option>
                        <option value={30}>Next 30 Days</option>
                        <option value={60}>Next 60 Days</option>
                        <option value={90}>Next 90 Days</option>
                        <option value={365}>Next 1 Year</option>
                    </select>
                </div>
            
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-secondary" onClick={handlePrint} disabled={reportData.length === 0}>
                        <FontAwesomeIcon icon={faPrint} /> Print
                    </button>
                    <button className="btn btn-secondary" onClick={handleExportExcel} disabled={reportData.length === 0}>
                        <FontAwesomeIcon icon={faFileExcel} /> Excel
                    </button>
                </div>
            </div>

            {/* TABLE */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            

                <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--header)' }}>
                                {columns.map((c, i) => (
                                    <th key={i} style={{ padding: '12px 16px', color: 'white', textAlign: i === 0 ? 'center' : 'left', fontSize: '13px', fontWeight: '600' }}>{c}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
                            ) : currentItems.length === 0 ? (
                                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No items expiring in the selected timeframe. All good! 👍</td></tr>
                            ) : (
                                currentItems.map((item, idx) => {
                                    const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                                    return (
                                        <tr key={item._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: '13px' }}>{serialNumber}</td>
                                            <td style={{ padding: '10px 16px', fontWeight: '500',textAlign: 'left', fontSize: '13px' }}>{item.productName}</td>
                                            <td style={{ padding: '10px 16px',textAlign: 'left', fontSize: '13px' }}>{item.batchNumber}</td>
                                            <td style={{ padding: '10px 16px',textAlign: 'left', fontSize: '13px', fontWeight: 'bold', color: 'var(--primary)' }}>{item.quantity}</td>
                                            <td style={{ padding: '10px 16px',textAlign: 'left', fontSize: '13px' }}>{formatDate(item.expiryDate)}</td>
                                            <td style={{ padding: '10px 16px',textAlign: 'left', fontWeight: 'bold',  fontSize: '13px',color: item.status === 'Expired' ? 'var(--danger)' : 'var(--warning)' }}>
                                                {item.status}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 💡 PAGINATION CONTROLS */}
                {!loading && reportData.length > itemsPerPage && (
                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', padding: '16px', borderTop: '1px solid var(--border-color)' }}>
                        <button
                            className="btn btn-secondary"
                            disabled={currentPage === 1}
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
                            disabled={currentPage >= totalPages}
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
};

export default ExpiryReport;