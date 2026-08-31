import { useState, useEffect } from 'react';

function ProductSupplierReport() {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/reports/product-suppliers-matrix', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setReportData(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = reportData.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.categoryId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard-wrapper">
      
      {/* HEADER & SEARCH */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '18px', fontWeight: 600 }}>Product & Supplier Matrix Report</h4>
        </div>
        
        <div style={{ minWidth: '250px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search product or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* REPORT TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableStyles.th}>Sr#</th>
                <th style={tableStyles.th}>Product Name</th>
                <th style={tableStyles.th}>Category</th>
                <th style={tableStyles.th}>UOM</th>
                <th style={{ ...tableStyles.th, textAlign: 'center' }}>Available Qty</th>
                <th style={tableStyles.th}>Approved Suppliers & Purchase Rates</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading report data...</td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((p, index) => (
                  <tr key={p._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={tableStyles.td}>{index + 1}</td>
                    <td style={{ ...tableStyles.td, fontWeight: 'bold', color: 'var(--text-main)' }}>{p.name}</td>
                    <td style={tableStyles.td}>{p.categoryId?.name || 'N/A'}</td>
                    <td style={tableStyles.td}>{p.uomId?.name || 'N/A'}</td>
                    <td style={{ ...tableStyles.td, textAlign: 'center', fontWeight: 'bold', color: p.quantity <= (p.reorderQuantity || 0) ? 'var(--danger)' : 'var(--primary)' }}>
                      {p.quantity || 0}
                    </td>
                    <td style={{ ...tableStyles.td, padding: '10px 16px' }}>
                      {p.approvedSuppliers && p.approvedSuppliers.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {p.approvedSuppliers.map((supRow, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '6px 10px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                {supRow.supplier?.companyName || supRow.supplier?.name || supRow.supplier?.contactPerson || 'Unknown Supplier'}
                              </span>
                              <div style={{ display: 'flex', gap: '15px' }}>
                                <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>
                                  PKR {parseFloat(supRow.purchasePrice || 0).toFixed(2)}
                                </span>
                                <span style={{ color: 'var(--text-muted)' }}>
                                  SKU: {supRow.supplierSKU || '—'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '12px' }}>No suppliers linked</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No products found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

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
    padding: '12px 16px',
    color: 'var(--text-main)',
    fontSize: '13px',
    textAlign: 'left',
    verticalAlign: 'middle'
  }
};

export default ProductSupplierReport;