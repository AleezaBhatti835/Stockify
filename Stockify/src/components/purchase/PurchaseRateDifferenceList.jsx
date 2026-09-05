import React, { useState, useEffect } from 'react';
import { usePrintSettings } from '../../context/PrintSettingsContext';

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
                maxWidth: '900px',
                bodyPadding: '24px',
                fontSize: '14px',
                mono: false,
                narrow: false,
                printCss: `@page { size: A4; margin: 20mm; }`
            };
    }
};

const PurchaseRateDifferenceList = () => {
    const [differences, setDifferences] = useState([]);
    const [filteredDifferences, setFilteredDifferences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState([]);
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

    // ================= FILTERS SET TO TODAY =================
    const [filters, setFilters] = useState({
        supplier: '',
        dateFrom: getTodayDate(),
        dateTo: getTodayDate()
    });

    const [selectedDifference, setSelectedDifference] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchDifferences();
        fetchSuppliers();
    }, []);

    useEffect(() => {
        applyFilters();
        // eslint-disable-next-line
    }, [differences, filters]);

    // ================= FETCH DIFFERENCES (WITH TOKEN) =================
    const fetchDifferences = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/purchase-rate-difference', {
                cache: 'no-store',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
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

    // ================= FETCH SUPPLIERS (WITH TOKEN) =================
    const fetchSuppliers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/suppliers', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            setSuppliers(data);
        } catch (error) {
            console.error("Error fetching suppliers:", error);
        }
    };

    const applyFilters = () => {
        let filtered = [...differences];

        if (filters.supplier) {
            filtered = filtered.filter(diff =>
                diff.supplierId?._id === filters.supplier ||
                diff.supplierId?.contactPerson?.toLowerCase().includes(filters.supplier.toLowerCase()) ||
                diff.supplierId?.companyName?.toLowerCase().includes(filters.supplier.toLowerCase())
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

    // ================= CLEAR FILTERS SET TO TODAY =================
    const clearFilters = () => {
        setFilters({
            supplier: '',
            dateFrom: getTodayDate(),
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
            <div className="modal-overlay" onClick={closeModal}>
                <div className="modal-container" style={{ maxWidth: paperConfig.maxWidth, width: '100%', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>

                    <div className="modal-header" style={{ flexDirection: paperConfig.narrow ? 'column' : 'row', gap: paperConfig.narrow ? 'var(--space-md)' : '0' }}>
                        <h3 className="modal-title" style={{ color: 'var(--text-main)', fontSize: '18px' }}>Stockify</h3>

                        <div style={{ display: 'flex', gap: 'var(--space-sm)', width: paperConfig.narrow ? '100%' : 'auto' }}>
                            <button
                                className="btn btn-primary"
                                style={paperConfig.narrow ? { flex: 1 } : {}}
                                onClick={handlePrint}
                            >
                                🖨️ Print
                            </button>
                            <button
                                className="btn btn-secondary"
                                style={paperConfig.narrow ? { flex: 1 } : {}}
                                onClick={closeModal}
                            >
                                ✕ Close
                            </button>
                        </div>
                    </div>

                    <div
                        className="modal-body"
                        style={{
                            ...styles.receiptBody,
                            padding: paperConfig.bodyPadding,
                            fontSize: paperConfig.fontSize,
                            fontFamily: paperConfig.mono ? "'Courier New', monospace" : 'inherit'
                        }}
                        id="receipt-content"
                    >
                        <div style={styles.receiptHeaderInfo}>
                            <h4 style={{ textAlign: 'center', margin: '4px 0 16px 0', color: 'var(--text-main)', fontSize: '16px', fontWeight: 'bold' }}>RATE DIFFERENCE VOUCHER</h4>
                            <p style={{ textAlign: 'left', margin: '6px 0', color: 'var(--text-main)' }}><strong>Voucher #:</strong> {selectedDifference.differenceNumber || 'N/A'}</p>
                            <p style={{ textAlign: 'left', margin: '6px 0', color: 'var(--text-main)' }}><strong>Linked Invoice #:</strong> {selectedDifference.invoiceNumber || 'N/A'}</p>
                            <p style={{ textAlign: 'left', margin: '6px 0', color: 'var(--text-main)' }}><strong>Date:</strong> {formatDate(selectedDifference.createdAt || selectedDifference.date)}</p>
                            <p style={{ textAlign: 'left', margin: '6px 0', color: 'var(--text-main)' }}>
                                <strong>Supplier:</strong> {selectedDifference.supplierId?.contactPerson || selectedDifference.supplierId?.companyName || 'Unknown'}
                            </p>
                        </div>
                        <div style={styles.receiptDivider}></div>

                        {paperConfig.mono ? (
                            <div>
                                {(selectedDifference.items || []).map((item, idx) => (
                                    <div key={idx} style={styles.thermalItemRow}>
                                        <div style={styles.thermalItemLine1}>
                                            <span>{item.product?.name || 'Unknown Product'}</span>
                                            <span>x{item.purchasedQuantity}</span>
                                        </div>
                                        <div style={styles.thermalItemLine2}>
                                            <span>{item.prevRate?.toFixed(2)} → {item.newRate?.toFixed(2)}</span>
                                            <span style={{ fontWeight: 700, color: item.totalDifference > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                                {item.totalDifference > 0 ? '+' : ''}{item.totalDifference?.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <table style={styles.receiptTable}>
                                <thead style={{borderBottom: '1px solid #5f9382'}}>
                                    <tr>
                                        <th style={{ ...styles.receiptTh, width: '20%' }}>Product Name</th>
                                        <th style={{ ...styles.receiptTh, textAlign: 'left', width: '15%' }}>Qty</th>
                                        <th style={{ ...styles.receiptTh, textAlign: 'left', width: '21%' }}>Prev Rate</th>
                                        <th style={{ ...styles.receiptTh, textAlign: 'left', width: '22%' }}>New Rate</th>
                                        <th style={{ ...styles.receiptTh, textAlign: 'left', width: '20%' }}>Diff</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(selectedDifference.items || []).map((item, idx) => (
                                        <tr key={idx}>
                                            <td style={styles.receiptTdName}>{item.product?.name || 'Unknown Product'}</td>
                                            <td style={{ ...styles.receiptTd, textAlign: 'left' }}>{item.purchasedQuantity}</td>
                                            <td style={{ ...styles.receiptTd, textAlign: 'left' }}>{item.prevRate?.toFixed(2)}</td>
                                            <td style={{ ...styles.receiptTd, textAlign: 'left' }}>{item.newRate?.toFixed(2)}</td>
                                            <td style={{ ...styles.receiptTd, fontWeight: 600, textAlign: 'left', color: item.totalDifference > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                                {item.totalDifference > 0 ? '+' : ''}{item.totalDifference?.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        <div style={styles.receiptDivider}></div>
                        <div style={styles.receiptTotals}>
                            <div style={{ ...styles.receiptTotalRow, fontWeight: 700, fontSize: '1.15em', borderTop: '2px solid var(--border-color)', paddingTop: '10px' }}>
                                <span>Net Rate Difference</span>
                                <span style={{ color: selectedDifference.netDifference > 0 ? 'var(--danger)' : 'var(--success)' }}>
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

    if (loading) return <div style={{ padding: '20px', color: 'var(--text-main)' }}>Loading records...</div>;

    return (
        <div className="dashboard-wrapper">

            <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: '1', minWidth: '200px', marginBottom: 0 }}>
                    <label className="form-label">Supplier</label>
                    <select
                        className="form-input"
                        name="supplier"
                        value={filters.supplier}
                        onChange={handleFilterChange}
                    >
                        <option value="">All Suppliers</option>
                        {suppliers.map(s => (
                            <option key={s._id} value={s._id}>
                                {s.contactPerson || s.companyName}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group" style={{ flex: '1', minWidth: '150px', marginBottom: 0 }}>
                    <label className="form-label">Date From</label>
                    <input
                        type="date"
                        className="form-input"
                        name="dateFrom"
                        value={filters.dateFrom}
                        onChange={handleFilterChange}
                        max={filters.dateTo}
                    />
                </div>

                <div className="form-group" style={{ flex: '1', minWidth: '150px', marginBottom: 0 }}>
                    <label className="form-label">Date To</label>
                    <input
                        type="date"
                        className="form-input"
                        name="dateTo"
                        value={filters.dateTo}
                        onChange={handleFilterChange}
                        min={filters.dateFrom}
                    />
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button className="btn btn-secondary" onClick={clearFilters}>
                        Clear Filters
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={tableStyles.th}>Sr #</th>
                                <th style={tableStyles.th}>PRD #</th>
                                <th style={tableStyles.th}>Invoice #</th>
                                <th style={tableStyles.th}>Date</th>
                                <th style={tableStyles.th}>Supplier</th>
                                <th style={tableStyles.th}>Net Difference</th>
                                <th style={{ ...tableStyles.th, textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.length > 0 ? (
                                currentItems.map((diff, index) => {
                                    const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                                    return (
                                        <tr 
                                            key={diff._id || index}
                                            style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <td style={tableStyles.td}>{serialNumber}</td>
                                            <td style={tableStyles.td}>{diff.differenceNumber || 'N/A'}</td>
                                            <td style={tableStyles.td}>{diff.invoiceNumber || 'N/A'}</td>
                                            <td style={tableStyles.td}>{formatDate(diff.createdAt || diff.date)}</td>
                                            <td style={tableStyles.td}>{diff.supplierId?.contactPerson || diff.supplierId?.companyName || 'Unknown'}</td>
                                            <td style={{ ...tableStyles.td, color: diff.netDifference > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                                                {diff.netDifference > 0 ? '+' : ''}{diff.netDifference || 0}
                                            </td>
                                            <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                    <button
                                                        style={{ backgroundColor: 'var(--view)', color: 'var(--success)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                        onClick={() => openModal(diff)}
                                                        title="View Details"
                                                    >
                                                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                            <circle cx="12" cy="12" r="3"></circle>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="7" style={tableStyles.emptyCell}>
                                        No records found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredDifferences.length > itemsPerPage && (
                    <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', alignItems: 'center', padding: 'var(--space-md)' }}>
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

            {isModalOpen && selectedDifference && renderReceipt()}
        </div>
    );
};

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

const actionStyles = {
    iconBtnView: {
        backgroundColor: 'var(--success-bg)',
        color: 'var(--viewtext)',
        border: 'none',
        padding: '6px',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center'
    }
};

const styles = {
    receiptBody: { overflowY: 'auto', overflowX: 'hidden', flex: 1, color: 'var(--text-main)' },
    receiptHeaderInfo: { textAlign: 'left', marginBottom: '16px' },
    receiptDivider: { borderTop: '2px dashed var(--border-color)', margin: '14px 0' },
    receiptTable: { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '12px' },
    receiptTh: { textAlign: 'left', padding: '8px 12px', backgroundColor: 'var(--primary-light)', borderBottom: '2px solid var(--border-color)', fontSize: '12px', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    receiptTd: { padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-main)' },
    receiptTdName: { padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' },
    receiptTotals: { marginTop: '14px' },
    receiptTotalRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: 'var(--text-main)' },
    thermalItemRow: { borderBottom: '1px dashed var(--border-color)', padding: '6px 0' },
    thermalItemLine1: { display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1em', color: 'var(--text-main)' },
    thermalItemLine2: { display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '2px' }
};

export default PurchaseRateDifferenceList;