import { useState, useEffect } from 'react';

const TAB_TITLES = {
  current: 'Current Stock',
  expiry: 'Expiry Products',
  reorder: 'Reorder Levels'
};

function Stock({ view = 'current' }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const activeTab = view;
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [filterCategory, setFilterCategory] = useState('');
  const [filterUom, setFilterUom] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchUOMs();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isViewModalOpen) {
          e.preventDefault();
          setIsViewModalOpen(false);
          setViewProduct(null);
        } else if (filterCategory || filterUom) {
          e.preventDefault();
          clearFilters();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isViewModalOpen, filterCategory, filterUom]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, filterUom, products, activeTab]);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 6000);
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } else {
        setProducts([]);
        showMessage('Error fetching products.', 'error');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
      showMessage('Server error while fetching products.', 'error');
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const fetchUOMs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/uoms', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUoms(Array.isArray(data) ? data : []);
      } else {
        setUoms([]);
      }
    } catch (error) {
      console.error('Error fetching UOMs:', error);
      setUoms([]);
    }
  };

  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(dateStr);
    expiry.setHours(0, 0, 0, 0);
    return Math.round((expiry - today) / (1000 * 60 * 60 * 24));
  };

  // DATA INTEGRITY: Dynamic badging system assigning real-time status indicators based on calculated thresholds.
  const getExpiryBadge = (dateStr) => {
    const days = daysUntil(dateStr);
    if (days === null) return null;
    if (days < 0) return { text: 'Expired', bg: 'var(--danger-bg)', color: 'var(--danger)' };
    if (days <= 7) return { text: 'Expiring soon', bg: '#fef3c7', color: '#b45309' };
    return null;
  };

  const getReorderBadge = (quantity) => {
    if (quantity <= 0) return { text: 'Out of stock', bg: 'var(--danger-bg)', color: 'var(--danger)' };
    if (quantity <= 5) return { text: 'Critical', bg: 'var(--danger-bg)', color: 'var(--danger)' };
    return { text: 'Low stock', bg: '#fef3c7', color: '#b45309' };
  };

  // CORE ARCHITECTURE: Unified multi-view data processing engine handling stock, expiry, and reorder levels.
  const currentStock = products.filter(p => (p.quantity || 0) > 0);
  const expiryProducts = products
    .filter(p => !!p.expiryDate && daysUntil(p.expiryDate) < 0)
    .slice()
    .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
  const reorderProducts = products.filter(p => (p.quantity || 0) <= (p.reorderQuantity || 0));

  const getBaseList = () => {
    if (activeTab === 'current') return currentStock;
    if (activeTab === 'expiry') return expiryProducts;
    return reorderProducts;
  };

  const filteredList = getBaseList().filter(p => {
    if (filterCategory) {
      const catId = p.categoryId?._id || p.categoryId;
      if (catId !== filterCategory) return false;
    }
    if (filterUom) {
      const uomId = p.uomId?._id || p.uomId;
      if (uomId !== filterUom) return false;
    }
    return true;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);

  const hasActiveFilters = filterCategory || filterUom;

  const clearFilters = () => {
    setFilterCategory('');
    setFilterUom('');
  };

  const renderEmptyMessage = () => {
    if (hasActiveFilters) return 'No products match the selected filters.';
    if (activeTab === 'current') return 'No products currently in stock.';
    if (activeTab === 'expiry') return 'No expired products found.';
    return 'No products at or below reorder level.';
  };

  const getColumns = () => {
    const base = [
      { key: 'index', label: 'SR#', width: '6%', align: 'left' },
      { key: 'name', label: 'Name', width: '10%', align: 'left' },
      { key: 'category', label: 'Category', width: '15%', align: 'left' },
      { key: 'uom', label: 'UOM', width: '10%', align: 'left' },
      { key: 'quantity', label: 'Quantity', width: '10%', align: 'center' }
    ];

    if (activeTab === 'current') {
      return [
        ...base,
        { key: 'costPrice', label: 'Cost Price', width: '15%', align: 'center' },
        { key: 'retailPrice', label: 'Retail Price', width: '15%', align: 'center' }
      ];
    }

    if (activeTab === 'reorder') {
      return [
        ...base,
        { key: 'reorderQuantity', label: 'Reorder', width: '10%', align: 'center' },
        { key: 'costPrice', label: 'Cost Price', width: '12%', align: 'center' },
        { key: 'retailPrice', label: 'Retail Price', width: '12%', align: 'center' },
        { key: 'status', label: 'Status', width: '15%', align: 'center' }
      ];
    }

    return [
      ...base,
      { key: 'expiryDate', label: 'Expiry Date', width: '15%', align: 'center' },
    ];
  };

  const columns = getColumns();

  const renderCell = (p, index, col) => {
    switch (col.key) {
      case 'index':
        return (currentPage - 1) * itemsPerPage + index + 1;
      case 'name':
        return p.name;
      case 'category':
        return p.categoryId?.name || 'N/A';
      case 'uom':
        return p.uomId?.name || 'N/A';
      case 'quantity':
        return p.quantity;
      case 'reorderQuantity':
        return p.reorderQuantity;
      case 'costPrice':
        return `${parseFloat(p.costPrice || 0).toFixed(2)}`;
      case 'retailPrice':
        return `${parseFloat(p.retailPrice || 0).toFixed(2)}`;
      case 'expiryDate':
        return p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : 'N/A';
      case 'status': {
        const badge = activeTab === 'expiry' ? getExpiryBadge(p.expiryDate) : getReorderBadge(p.quantity);
        if (!badge) return null;
        return (
          <span style={{
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            display: 'inline-block',
            backgroundColor: badge.bg,
            color: badge.color
          }}>
            {badge.text}
          </span>
        );
      }
      default:
        return null;
    }
  };

  const InlineMessage = ({ msg }) => {
    if (!msg.text) return null;
    const colors = {
      success: { bg: 'var(--success-bg)', text: 'var(--success)', border: 'var(--success)', icon: '✅' },
      error: { bg: 'var(--danger-bg)', text: 'var(--danger)', border: 'var(--danger)', icon: '⚠️' }
    };
    const style = colors[msg.type] || colors.success;

    return (
      <div style={{ padding: '10px 14px', marginBottom: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}`, fontSize: '14px', fontWeight: 500 }}>
        {style.icon} {msg.text}
      </div>
    );
  };

  return (
    <div className="dashboard-wrapper">
      
      <InlineMessage msg={message} />

      {/* FILTER BAR */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
          <label className="form-label">Category</label>
          <select className="form-input" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
          <label className="form-label">UOM</label>
          <select className="form-input" value={filterUom} onChange={(e) => setFilterUom(e.target.value)}>
            <option value="">All UOMs</option>
            {uoms.map(u => (
              <option key={u._id} value={u._id}>{u.name}</option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button className="btn btn-secondary" onClick={clearFilters}>
            Clear Filters
          </button>
        )}
      </div>

      {/* TABLE SECTION */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--header)'}}>
                {columns.map(col => (
                  <th key={col.key} style={{ width: col.width, textAlign: col.align, padding: '12px 16px', color: '#ffff', fontSize: '13px', fontWeight: '600' }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((p, index) => (
                  <tr 
                    key={p._id}
                    style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {columns.map(col => (
                      <td
                        key={col.key}
                        style={{
                          padding: '8px 16px',
                          fontSize: '13px',
                          color: col.key === 'index' ? 'var(--text-muted)' : 'var(--text-main)',
                          fontWeight: col.key === 'index' ? 500 : undefined,
                          textAlign: col.align,
                          overflow: ['name', 'category', 'uom'].includes(col.key) ? 'hidden' : undefined,
                          textOverflow: ['name', 'category', 'uom'].includes(col.key) ? 'ellipsis' : undefined,
                          whiteSpace: ['name', 'category', 'uom'].includes(col.key) ? 'nowrap' : undefined
                        }}
                      >
                        {renderCell(p, index, col)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>
                    {renderEmptyMessage()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {filteredList.length > itemsPerPage && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '16px' }}>
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
}

export default Stock;