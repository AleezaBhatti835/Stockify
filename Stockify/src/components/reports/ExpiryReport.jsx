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

    useEffect(() => {
        fetchExpiryReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [days]);

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

    // Export Logic
    const handlePrint = () => { /* Add Print Logic similar to your other reports */ };
    
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
            {/* HEADER */}
               {/* FILTER BAR */}
            <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
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
                <button className="btn btn-primary" onClick={fetchExpiryReport} disabled={loading} style={{ height: '38px', padding: '0 24px' }}>
                    <FontAwesomeIcon icon={faSearch} style={{ marginRight: '6px' }} /> {loading ? 'Checking...' : 'Check Stock'}
                </button>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-secondary" onClick={handleExportExcel} disabled={reportData.length === 0}><FontAwesomeIcon icon={faFileExcel} /> Excel</button>
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
                                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center' }}>Loading...</td></tr>
                            ) : reportData.length === 0 ? (
                                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center' }}>No items expiring in the selected timeframe. All good! 👍</td></tr>
                            ) : (
                                reportData.map((item, idx) => (
                                    <tr key={item._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: '13px' }}>{idx + 1}</td>
                                        <td style={{ padding: '10px 16px', fontWeight: '500',textAlign: 'left', fontSize: '13px' }}>{item.productName}</td>
                                        <td style={{ padding: '10px 16px',textAlign: 'left', fontSize: '13px' }}>{item.batchNumber}</td>
                                        <td style={{ padding: '10px 16px',textAlign: 'left', fontSize: '13px', fontWeight: 'bold', color: 'var(--primary)' }}>{item.quantity}</td>
                                        <td style={{ padding: '10px 16px',textAlign: 'left', fontSize: '13px' }}>{formatDate(item.expiryDate)}</td>
                                        <td style={{ padding: '10px 16px',textAlign: 'left', fontWeight: 'bold',  fontSize: '13px',color: item.status === 'Expired' ? 'var(--danger)' : 'var(--warning)' }}>
                                            {item.status}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ExpiryReport;