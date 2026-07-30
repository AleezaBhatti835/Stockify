import React, { useState, useEffect } from 'react';
import { usePrintSettings } from '../../context/PrintSettingsContext';
import '../purchase/purchase.css'; // reuse same base styling as purchase screens
import '../roles.css';

// ============== EXACT PAPER CONFIG FROM REFERENCE ==============
const getPaperConfig = (paperSize) => {
    switch (paperSize) {
        case 'Thermal58':
            return {
                maxWidth: '320px',
                bodyPadding: '14px',
                fontSize: '12px',
                mono: true,
                narrow: true,
                printCss: `@page { size: 58mm auto; margin: 4mm; }`
            };
        case 'A5':
            return {
                maxWidth: '460px',
                bodyPadding: '20px',
                fontSize: '13px',
                mono: false,
                narrow: false,
                printCss: `@page { size: A5; margin: 12mm; }`
            };
        case 'A4':
        default:
            return {
                maxWidth: '800px',
                bodyPadding: '24px',
                fontSize: '14px',
                mono: false,
                narrow: false,
                printCss: `@page { size: A4; margin: 20mm; }`
            };
    }
};

const SaleRateDifferenceList = () => {
    const [differences, setDifferences] = useState([]);
    const [filteredDifferences, setFilteredDifferences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const { settings: printSettings } = usePrintSettings();

    const getTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getLastMonthDate = () => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [filters, setFilters] = useState({
        customer: '',
        dateFrom: getLastMonthDate(),
        dateTo: getTodayDate()
    });

    const [selectedDifference, setSelectedDifference] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchDifferences();
        fetchCustomers();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [differences, filters]);

    const fetchDifferences = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/sale-rate-difference', {
                cache: 'no-store'
            });
            const data = await response.json();

            // SORT IN ASCENDING ORDER (Oldest first, Latest at the end)
            const sortedData = data.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.date);
                const dateB = new Date(b.createdAt || b.date);
                return dateA - dateB; // Ascending (Oldest first)
            });

            setDifferences(sortedData);
            setFilteredDifferences(sortedData);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching rate differences:", error);
            setLoading(false);
        }
    };

    const fetchCustomers = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/customers');
            const data = await response.json();
            setCustomers(data);
        } catch (error) {
            console.error("Error fetching customers:", error);
        }
    };

    const applyFilters = () => {
        let filtered = [...differences];

        if (filters.customer) {
            filtered = filtered.filter(diff =>
                diff.customerId?._id === filters.customer ||
                diff.customerId?.customerName?.toLowerCase().includes(filters.customer.toLowerCase()) ||
                diff.customerId?.name?.toLowerCase().includes(filters.customer.toLowerCase())
            );
        }

        if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            filtered = filtered.filter(diff => {
                const recordDate = new Date(diff.createdAt || diff.date);
                recordDate.setHours(0, 0, 0, 0);
                return recordDate >= fromDate;
            });
        }

        if (filters.dateTo) {
            const toDate = new Date(filters.dateTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(diff => {
                const recordDate = new Date(diff.createdAt || diff.date);
                recordDate.setHours(23, 59, 59, 999);
                return recordDate <= toDate;
            });
        }

        setFilteredDifferences(filtered);
        setCurrentPage(1);
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const clearFilters = () => {
        setFilters({
            customer: '',
            dateFrom: getLastMonthDate(),
            dateTo: getTodayDate()
        });
        setCurrentPage(1);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const openModal = (diff) => {
        setSelectedDifference(diff);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setSelectedDifference(null);
        setIsModalOpen(false);
    };

    const getUniqueCustomers = () => {
        const uniqueCustomers = new Map();
        differences.forEach(diff => {
            if (diff.customerId) {
                const id = diff.customerId._id || diff.customerId;
                if (!uniqueCustomers.has(id)) {
                    uniqueCustomers.set(id, {
                        _id: id,
                        name: diff.customerId.customerName || diff.customerId.name || 'Walk-in Customer'
                    });
                }
            }
        });
        return Array.from(uniqueCustomers.values());
    };

    // Print Logic
    const handlePrint = () => {
        const paperConfig = getPaperConfig(printSettings?.paperSize);
        const contentEl = document.getElementById('receipt-content');
        if (!contentEl || !selectedDifference) return;

        let pageSizeCss;
        if (paperConfig.mono) {
            const itemCount = (selectedDifference.items || []).length;
            const THERMAL_BASE_MM = 75;
            const THERMAL_ITEM_MM = 9;
            const heightMm = THERMAL_BASE_MM + itemCount * THERMAL_ITEM_MM;
            pageSizeCss = `@page { size: 58mm ${heightMm}mm; margin: 4mm; }`;
        } else if ((printSettings?.paperSize || 'A4') === 'A5') {
            pageSizeCss = `@page { size: 148mm 210mm; margin: 12mm; }`;
        } else {
            pageSizeCss = `@page { size: 210mm 297mm; margin: 20mm; }`;
        }

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.top = '-10000px';
        iframe.style.left = '-10000px';
        iframe.style.width = paperConfig.mono ? '58mm' : '210mm';
        iframe.style.height = '10px';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
        <html>
            <head>
                <style>
                    * { box-sizing: border-box; }
                    ${pageSizeCss}
                    html, body { margin: 0; padding: 0; }
                    body {
                        padding: ${paperConfig.bodyPadding};
                        font-family: ${paperConfig.mono ? "'Courier New', monospace" : 'Arial, sans-serif'};
                        font-size: ${paperConfig.fontSize};
                        color: #000;
                        ${paperConfig.mono ? 'width: 58mm;' : ''}
                    }
                </style>
            </head>
            <body>${contentEl.innerHTML}</body>
        </html>
    `);
        doc.close();

        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => document.body.removeChild(iframe), 500);
        }, 300);
    };

    // Render Receipt Modal
    const renderReceipt = () => {
        if (!selectedDifference) return null;

        const paperConfig = getPaperConfig(printSettings?.paperSize);

        return (
            <div style={styles.receiptOverlay} onClick={closeModal}>
                <div style={{ ...styles.receiptContainer, maxWidth: paperConfig.maxWidth }} onClick={(e) => e.stopPropagation()}>

                    <div style={{ ...styles.receiptHeader, flexDirection: paperConfig.narrow ? 'column' : 'row', gap: paperConfig.narrow ? '10px' : '0' }}>
                        <h3 style={{ margin: 0, color: '#000' }}>CAPOBIZ</h3>

                        <div style={{ ...styles.receiptActions, width: paperConfig.narrow ? '100%' : 'auto' }}>
                            <button
                                className="receipt-print-btn"
                                style={{ ...styles.printReceiptBtn, ...(paperConfig.narrow ? { flex: 1 } : {}) }}
                                onClick={handlePrint}
                            >
                                🖨️ Print
                            </button>
                            <button
                                className="receipt-close-btn"
                                style={{ ...styles.closeReceiptBtn, ...(paperConfig.narrow ? { flex: 1 } : {}) }}
                                onClick={closeModal}
                            >
                                ✕ Close
                            </button>
                        </div>
                    </div>

                    <div
                        style={{
                            ...styles.receiptBody,
                            padding: paperConfig.bodyPadding,
                            fontSize: paperConfig.fontSize,
                            fontFamily: paperConfig.mono ? "'Courier New', monospace" : 'inherit'
                        }}
                        id="receipt-content"
                    >
                        <div style={styles.receiptHeaderInfo}>
                            <h4 style={{ textAlign: 'center', margin: '4px 0', color: '#333' }}>SALE RATE DIFFERENCE VOUCHER</h4>
                            <p style={{ textAlign: 'left', margin: '4px 0', color: '#333' }}>Voucher #: {selectedDifference.differenceNumber || 'N/A'}</p>
                            <p style={{ textAlign: 'left', margin: '4px 0', color: '#333' }}>Linked Invoice #: {selectedDifference.invoiceNumber || 'N/A'}</p>
                            <p style={{ textAlign: 'left', margin: '4px 0', color: '#333' }}>Date: {formatDate(selectedDifference.createdAt || selectedDifference.date)}</p>
                            <p style={{ textAlign: 'left', margin: '4px 0', color: '#333' }}>
                                Customer: {selectedDifference.customerId?.customerName || selectedDifference.customerId?.name || 'Walk-in Customer'}
                            </p>
                        </div>
                        <div style={styles.receiptDivider}></div>

                        {paperConfig.mono ? (
                            <div>
                                {(selectedDifference.items || []).map((item, idx) => (
                                    <div key={idx} style={styles.thermalItemRow}>
                                        <div style={styles.thermalItemLine1}>
                                            <span>{item.product?.name || 'Unknown Product'}</span>
                                            <span>x{item.soldQuantity}</span>
                                        </div>
                                        <div style={styles.thermalItemLine2}>
                                            <span>{item.prevRate?.toFixed(2)} → {item.newRate?.toFixed(2)}</span>
                                            <span style={{ fontWeight: 700, color: item.totalDifference > 0 ? 'green' : 'red' }}>
                                                {item.totalDifference > 0 ? '+' : ''}{item.totalDifference?.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <table style={styles.receiptTable}>
                                <thead>
                                    <tr>
                                        <th style={{ ...styles.receiptTh, width: '30%' }}>Product Name</th>
                                        <th style={{ ...styles.receiptTh, textAlign: 'left', width: '12%' }}>Qty</th>
                                        <th style={{ ...styles.receiptTh, textAlign: 'left', width: '19%' }}>Prev Rate</th>
                                        <th style={{ ...styles.receiptTh, textAlign: 'left', width: '19%' }}>New Rate</th>
                                        <th style={{ ...styles.receiptTh, textAlign: 'right', width: '20%' }}>Diff</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(selectedDifference.items || []).map((item, idx) => (
                                        <tr key={idx}>
                                            <td style={styles.receiptTdName}>{item.product?.name || 'Unknown Product'}</td>
                                            <td style={{ ...styles.receiptTd, textAlign: 'left' }}>{item.soldQuantity}</td>
                                            <td style={{ ...styles.receiptTd, textAlign: 'left' }}>{item.prevRate?.toFixed(2)}</td>
                                            <td style={{ ...styles.receiptTd, textAlign: 'left' }}>{item.newRate?.toFixed(2)}</td>
                                            <td style={{ ...styles.receiptTd, fontWeight: 600, textAlign: 'right', color: item.totalDifference > 0 ? 'green' : 'red' }}>
                                                {item.totalDifference > 0 ? '+' : ''}{item.totalDifference?.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        <div style={styles.receiptDivider}></div>
                        <div style={styles.receiptTotals}>
                            <div style={{ ...styles.receiptTotalRow, fontWeight: 700, fontSize: '1.25em', borderTop: '2px solid #000', paddingTop: '10px' }}>
                                <span>Net Rate Difference</span>
                                <span style={{ color: selectedDifference.netDifference > 0 ? 'green' : 'red' }}>
                                    {selectedDifference.netDifference > 0 ? '+' : ''}
                                    {(selectedDifference.netDifference || 0).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        );
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredDifferences.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredDifferences.length / itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    if (loading) return <div style={{ padding: '20px' }}>Loading records...</div>;

    return (
        <div className="panel" style={{ width: '95%', padding: '25px', borderRadius: '8px', backgroundColor: '#fff', marginTop: '0px', marginBottom: '90px' }}>

            {/* FILTER SECTION */}
            <div style={{
                marginBottom: '2px',
                padding: '15px',
                borderRadius: '6px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '15px',
                alignItems: 'flex-end',
                textAlign: 'left'
            }}>
              <div style={{ flex: '1', minWidth: '150px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '4px' }}>
                        Customer
                    </label>
                    <select
                        name="customer"
                        value={filters.customer}
                        onChange={handleFilterChange}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #ced4da',
                            fontSize: '14px'
                        }}
                    >
                        <option value="">All Customers</option>
                        {/* Yahan hum directly 'customers' array use kar rahe hain */}
                        {customers.map(c => (
                            <option key={c._id} value={c._id}>
                                {c.customerName || c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ flex: '1', minWidth: '130px', textAlign: 'left' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '4px' }}>
                        Date From
                    </label>
                    <input
                        type="date"
                        name="dateFrom"
                        value={filters.dateFrom}
                        onChange={handleFilterChange}
                        max={filters.dateTo}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            border: '1px solid #ced4da',
                            fontSize: '14px',
                            backgroundColor: '#ffffff'
                        }}
                    />
                </div>

                <div style={{ flex: '1', minWidth: '130px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '4px' }}>
                        Date To
                    </label>
                    <input
                        type="date"
                        name="dateTo"
                        value={filters.dateTo}
                        onChange={handleFilterChange}
                        min={filters.dateFrom}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            border: '1px solid #ced4da',
                            fontSize: '14px',
                            backgroundColor: '#ffffff'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={clearFilters}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '14px',
                            height: '38px'
                        }}
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* RESULTS COUNT */}
            <div style={{
                marginBottom: '15px',
                fontSize: '12px',
                color: '#555',
                display: 'flex',
                justifyContent: 'space-between',
                textAlign: 'right',
                marginLeft: '78%'
            }}>
                <span>Showing {filteredDifferences.length} of {differences.length} records</span>
            </div>

            {/* MAIN SUMMARY TABLE */}
            <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid #eaeaea' }}>
                <table className="po-table">
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'center' }}>Sr #</th>
                            <th style={{ textAlign: 'left' }}>SRD #</th>
                            <th style={{ textAlign: 'left' }}>Invoice #</th>
                            <th style={{ textAlign: 'left' }}>Date</th>
                            <th style={{ textAlign: 'left' }}>Customer</th>
                            <th style={{ textAlign: 'left' }}>Net Difference</th>
                            <th style={{ textAlign: 'left' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody style={{ color: '#2b3a4a' }}>
                        {currentItems.length > 0 ? (
                            currentItems.map((diff, index) => {
                                const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                                return (
                                    <tr key={diff._id || index}>
                                        <td style={{ textAlign: 'center' }}>{serialNumber}</td>
                                        <td style={{ fontWeight: 'bold', textAlign: 'left' }}>
                                            {diff.differenceNumber || 'N/A'}
                                        </td>
                                        <td style={{ textAlign: 'left' }}>
                                            {diff.invoiceNumber || 'N/A'}
                                        </td>
                                        <td style={{ textAlign: 'left' }}>
                                            {formatDate(diff.createdAt || diff.date)}
                                        </td>
                                        <td style={{ textAlign: 'left' }}>
                                            {diff.customerId?.customerName || diff.customerId?.name || 'Walk-in Customer'}
                                        </td>
                                        <td style={{ fontWeight: 'bold', color: diff.netDifference > 0 ? 'green' : 'red', fontSize: '15px', textAlign: 'left' }}>
                                            {diff.netDifference > 0 ? '+' : ''}{diff.netDifference || 0}
                                        </td>
                                        <td style={{ textAlign: 'left' }}>
                                            <button
                                                style={styles.iconBtnView}
                                                onClick={() => openModal(diff)}
                                                title="View Details"
                                            >
                                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                    <circle cx="12" cy="12" r="3"></circle>
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#777' }}>
                                    No records found matching your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                <div style={{ marginTop: '20px', display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', paddingBottom: '20px' }}>
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: currentPage === 1 ? '#e9ecef' : '#5aa7ef',
                            color: currentPage === 1 ? '#6c757d' : 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        ←
                    </button>
                    <span style={{ fontSize: '12px', fontWeight: '400', color: '#868484' }}>Page {currentPage} of {totalPages || 1}</span>
                    <button
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: currentPage >= totalPages ? '#e9ecef' : '#5aa7ef',
                            color: currentPage >= totalPages ? '#6c757d' : 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        →
                    </button>
                </div>
            </div>

            {/* DETAILED RECEIPT VIEW MODAL */}
            {isModalOpen && selectedDifference && renderReceipt()}
        </div>
    );
};

const styles = {
    iconBtnView: {
        background: '#f0fdf4',
        color: '#264b61',
        border: '1px solid #ddecf5',
        padding: '8px',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.2s',
        backgroundColor: '#ebf5fc'
    },

    // Receipt Modal Styles ported from InvoiceList/POS
    receiptOverlay: { position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' },
    receiptContainer: { background: '#ffffff', borderRadius: '10px', border: '1px solid #000', width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 80px rgba(0,0,0,0.3)', overflow: 'hidden' },
    receiptHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'right', padding: '14px 18px', borderBottom: '2px solid #000', background: '#ffffff', flexShrink: 0 },
    receiptActions: { margin: '0 65%', textAlign: 'right', display: 'flex', gap: '10px', alignItems: 'right' },
    printReceiptBtn: { background: '#294463', color: '#fff', border: '1px solid #000', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' },
    closeReceiptBtn: { background: '#fff', color: '#000', border: '1px solid #000', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' },
    receiptBody: { overflowY: 'auto', overflowX: 'hidden', flex: 1, color: '#000' },
    receiptHeaderInfo: { textAlign: 'center', marginBottom: '16px' },
    receiptDivider: { borderTop: '2px dashed #000', margin: '14px 0' },
    receiptTable: { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '12px' },
    receiptTh: { textAlign: 'left', padding: '6px 8px', backgroundColor: '#394654', borderBottom: '2px solid #000', fontSize: '12px', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    receiptTd: { padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000' },
    receiptTdName: { padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' },
    receiptTotals: { marginTop: '14px' },
    receiptTotalRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#000' },
    thermalItemRow: { borderBottom: '1px dashed #000', padding: '6px 0' },
    thermalItemLine1: { display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1em', color: '#000' },
    thermalItemLine2: { display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: '#000', marginTop: '2px' }
};

export default SaleRateDifferenceList;