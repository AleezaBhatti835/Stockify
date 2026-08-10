// Stock.js
import { useState, useEffect } from 'react';
import './catalogue.css';
import '../roles.css';
import '../customer.css';

// Message Popup Component (same as Product.js)
function MessagePopup({ message, onClose }) {
  if (!message.text) return null;

  return (
    <div className="message-popup-overlay" onClick={onClose}>
      <div className={`message-popup ${message.type}`} onClick={(e) => e.stopPropagation()}>
        <button className="message-popup-close" onClick={onClose}>×</button>
        <div className="message-popup-content">
          <span className="message-popup-icon">
            {message.type === 'error' ? '⚠️' : '✅'}
          </span>
          <div className="message-popup-text">
            <strong>{message.type === 'error' ? 'Error!' : 'Success!'}</strong>
            {message.text}
          </div>
        </div>
      </div>
    </div>
  );
}

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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Filter state
  const [filterCategory, setFilterCategory] = useState('');
  const [filterUom, setFilterUom] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchUOMs();
  }, []);

  // Keyboard shortcut handler (ESC to close modals or reset filters)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isViewModalOpen) {
          e.preventDefault();
          setIsViewModalOpen(false);
          setViewProduct(null);
        } else if (filterCategory || filterUom) {
          // If filters are active, pressing Escape clears them
          e.preventDefault();
          clearFilters();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isViewModalOpen, filterCategory, filterUom]);

  // Reset to page 1 when filters change or data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, filterUom, products, activeTab]);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: '', type: '' });
    }, 6000);
  };

  const clearMessage = () => {
    setMessage({ text: '', type: '' });
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/products');
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
      const res = await fetch('http://localhost:5000/api/categories');
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
      const res = await fetch('http://localhost:5000/api/uoms');
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

  const getExpiryBadge = (dateStr) => {
    const days = daysUntil(dateStr);
    if (days === null) return null;
    if (days < 0) return { text: 'Expired', backgroundColor: '#f8d7da', color: '#721c24' };
    if (days <= 7) return { text: 'Expiring soon', backgroundColor: '#fff3cd', color: '#856404' };
    return null;
  };

  const getReorderBadge = (quantity) => {
    if (quantity <= 0) return { text: 'Out of stock', backgroundColor: '#f8d7da', color: '#721c24' };
    if (quantity <= 5) return { text: 'Critical', backgroundColor: '#f8d7da', color: '#721c24' };
    return { text: 'Low stock', backgroundColor: '#fff3cd', color: '#856404' };
  };

  // Base lists per submodule (before filters)
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

  // Apply Category / UOM filters on top of the base list for this tab
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

  // Pagination logic
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

  // Column definitions per tab
  const getColumns = () => {
    const base = [
      { key: 'index', label: 'SR#', width: '6%', align: 'left' },
      { key: 'name', label: 'Name', width: '11%', align: 'left' },
      { key: 'category', label: 'Category', width: '14%', align: 'left' },
      { key: 'uom', label: 'UOM', width: '10%', align: 'left' },
      { key: 'quantity', label: 'Quantity', width: '12%', align: 'center' }
    ];

    if (activeTab === 'current') {
      return [
        ...base,
        { key: 'costPrice', label: 'Cost Price', width: '16%', align: 'center' },
        { key: 'retailPrice', label: 'Retail Price', width: '16%', align: 'center' }
      ];
    }

    if (activeTab === 'reorder') {
      return [
        ...base,
        { key: 'reorderQuantity', label: 'Reorder', width: '11%', align: 'center' },
        { key: 'costPrice', label: 'Cost Price', width: '13%', align: 'center' },
        { key: 'retailPrice', label: 'Retail Price', width: '13%', align: 'center' },
        { key: 'status', label: 'Status', width: '13%', align: 'center' }
      ];
    }

    return [
      ...base,
      { key: 'expiryDate', label: 'Expiry Date', width: '18%', align: 'center' },
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
            backgroundColor: badge.backgroundColor,
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

  return (
    <div className="roles-container">
      <MessagePopup message={message} onClose={clearMessage} />

      {/* FILTER BAR */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '15px',
        alignItems: 'flex-end',
        marginBottom: '1px',
        padding: '16px',
        borderRadius: '6px',
        textAlign: 'left'
      }}>
        <div style={{ minWidth: '180px' }}>
          <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#495057', display: 'block', marginBottom: '4px' }}>Category</label>
          <select
            style={{ fontSize: '0.7rem', width: '100%', padding: '9px 10px', border: '1px solid #ced4da', borderRadius: '4px', backgroundColor: 'white' }}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: '180px' }}>
          <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#495057', display: 'block', marginBottom: '4px' }}>UOM</label>
          <select
            style={{ fontSize: '0.7rem', width: '100%', padding: '9px 10px', border: '1px solid #ced4da', borderRadius: '4px', backgroundColor: 'white' }}
            value={filterUom}
            onChange={(e) => setFilterUom(e.target.value)}
          >
            <option value="">All UOMs</option>
            {uoms.map(u => (
              <option key={u._id} value={u._id}>{u.name}</option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            style={{
              padding: '9px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.7rem',
              whiteSpace: 'nowrap'
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* RESULTS COUNT */}
      <div style={{
        marginBottom: '7px',
        fontSize: '14px',
        color: '#555',
        display: 'flex',
        textAlign: 'right',
        marginLeft: '80%'
      }}>
        <span style={{ textAlign: 'right' }}>Showing {currentItems.length} of {filteredList.length} products</span>
      </div>

      {/* TABLE */}
      <div className="table-scroll-wrapper" style={{ overflowX: 'auto', width: '100%' }}>
        <table className="roles-table" style={{ width: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} style={{ width: col.width, textAlign: col.align }}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((p, index) => (
                <tr key={p._id}>
                  {columns.map(col => (
                    <td
                      key={col.key}
                      style={{
                        textAlign: col.align,
                        color: col.key === 'index' ? '#94a3b8' : undefined,
                        fontWeight: col.key === 'index' ? 500 : undefined,
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
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  {renderEmptyMessage()}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {filteredList.length > itemsPerPage && (
        <div style={{ 
          marginTop: '20px', 
          display: 'flex', 
          gap: '15px', 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: '10px 0'
        }}>
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
          
          <span style={{ fontSize: '12px', fontWeight: '400', color: '#868484' }}>
            Page {currentPage} of {totalPages || 1}
          </span>
          
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
      )}
    </div>
  );
}

export default Stock;