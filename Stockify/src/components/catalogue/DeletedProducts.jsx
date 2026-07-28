import { useState, useEffect } from 'react';
import './catalogue.css';
import '../roles.css';
import '../customer.css';

function DeletedProducts() {
  const [deletedProducts, setDeletedProducts] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Kept at 15 items per page

  useEffect(() => {
    fetchDeletedProducts();
  }, []);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: '', type: '' });
    }, 6000);
  };

  const fetchDeletedProducts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/products/deleted');
      if (res.ok) {
        const data = await res.json();
        setDeletedProducts(Array.isArray(data) ? data : []);
      } else {
        setDeletedProducts([]);
      }
    } catch (error) {
      console.error('Error fetching deleted products:', error);
      setDeletedProducts([]);
    }
  };

  const handleActivate = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/products/${id}/activate`, {
        method: 'PUT',
      });

      if (res.ok) {
        showMessage('Product activated successfully!', 'success');
        fetchDeletedProducts(); // Refresh the list
      } else {
        const errorData = await res.json();
        showMessage(errorData.message || 'Error activating product.', 'error');
      }
    } catch (error) {
      showMessage('Server error while activating product.', 'error');
    }
  };

  // Search Filter
  const filteredProducts = deletedProducts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.categoryId?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Helper to format date like '31-Dec-2025'
  const formatDate = (dateString) => {
    if (!dateString) return '---';
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-GB', options).replace(/ /g, '-');
  };

  return (
    <div className="roles-container">
      
      {message.text && (
        <div style={{ padding: '10px', marginBottom: '10px', borderRadius: '4px', color: '#fff', backgroundColor: message.type === 'error' ? '#dc3545' : '#28a745' }}>
          {message.text}
        </div>
      )}

  
      <div style={{ padding: '15px', display: 'flex', justifyContent: 'flex-end', backgroundColor: 'white'}}>
        <div style={{ position: 'relative' }}>
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset to page 1 on search
            }}
            style={{ padding: '8px 12px 8px 30px', borderRadius: '4px', width: '250px' }}
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="table-scroll-wrapper" style={{ overflowX: 'auto', width: '100%', backgroundColor: 'white', borderTop: 'none' }}>
        <table className="roles-table" style={{ width: '100%', tableLayout: 'auto', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#3a7d44', color: 'white' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>SR #</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>PRODUCT</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>CATEGORY</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>COST</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>RETAIL PRICE</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>QUANTITY</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>EXPIRY DATE</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>ACTIVATE</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((p, index) => {
                const serialNumber = indexOfFirstItem + index + 1;
                const isExpired = p.expiryDate && new Date(p.expiryDate) < new Date();

                return (
                  <tr key={p._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', color: '#666' }}>{serialNumber}</td>
                    <td style={{ padding: '12px', color: '#555' }}>{p.name}</td>
                    <td style={{ padding: '12px', color: '#666' }}>{p.categoryId?.name || 'N/A'}</td>
                    <td style={{ padding: '12px', color: '#666' }}>{parseFloat(p.costPrice).toFixed(2)}</td>
                    <td style={{ padding: '12px', color: '#666' }}>{parseFloat(p.retailPrice).toFixed(2)}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#666' }}>{p.quantity}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: isExpired ? '#dc3545' : '#28a745', fontWeight: 'bold' }}>
                      {formatDate(p.expiryDate)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleActivate(p._id)}
                        style={{
                          backgroundColor: '#619e77',
                          color: 'white',
                          border: 'none',
                          padding: '6px 16px',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        Activate
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  No deleted products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {filteredProducts.length > itemsPerPage && (
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
          
          <span style={{ fontSize: '12px', fontWeight: '400',color:'#868484' }}>
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

export default DeletedProducts;