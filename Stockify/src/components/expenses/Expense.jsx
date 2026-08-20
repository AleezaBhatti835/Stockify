import { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000';
const todayStr = () => new Date().toISOString().slice(0, 10);

const initialForm = {
  category: '', expenseName: '', date: todayStr(), amount: '', addedBy: '', description: ''
};

function Expense() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [originalForm, setOriginalForm] = useState(null); 
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState(''); 

  const [viewExpense, setViewExpense] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/expenses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/expense-categories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm(initialForm);
    setOriginalForm(null);
    setModalError(''); 
    setIsModalOpen(true);
  };

  const openEditModal = (exp) => {
    setEditingId(exp._id);
    const editData = {
      category: exp.category?._id || exp.category || '',
      expenseName: exp.expenseName,
      date: exp.date ? new Date(exp.date).toISOString().slice(0, 10) : todayStr(),
      amount: exp.amount,
      addedBy: exp.addedBy,
      description: exp.description || ''
    };
    setForm(editData);
    setOriginalForm(editData); 
    setModalError(''); 
    setIsModalOpen(true);
  };

  const startView = (exp) => {
    setViewExpense(exp);
  };

  const validate = () => {
    if (!form.category) return 'Please select an expense category.';
    if (!form.expenseName.trim()) return 'Expense name is required.';
    if (!form.date) return 'Date is required.';
    if (!form.amount || Number(form.amount) <= 0) return 'Amount must be greater than zero.';
    if (!form.addedBy.trim()) return 'Added by is required.';
    return null;
  };

  // CORE ARCHITECTURE: Unified save handler for both creating and updating expense records.
  const handleSave = async () => {
    setModalError(''); 
    
    const error = validate();
    if (error) {
      setModalError(error);
      return;
    }

    if (editingId && originalForm) {
      const isSame = 
        form.category === originalForm.category &&
        form.expenseName.trim() === originalForm.expenseName.trim() &&
        form.date === originalForm.date &&
        Number(form.amount) === Number(originalForm.amount) &&
        form.addedBy.trim() === originalForm.addedBy.trim() &&
        form.description.trim() === originalForm.description.trim();

      if (isSame) {
        setModalError('Nothing updated.');
        return;
      }
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = editingId ? `${API_BASE_URL}/api/expenses/${editingId}` : `${API_BASE_URL}/api/expenses`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category: form.category,
          expenseName: form.expenseName.trim(),
          date: form.date,
          amount: Number(form.amount),
          addedBy: form.addedBy.trim(),
          description: form.description.trim()
        })
      });
      const data = await res.json();

      if (res.ok) {
        showMessage(editingId ? 'Expense updated successfully!' : 'Expense added successfully!', 'success');
        setIsModalOpen(false);
        setForm(initialForm);
        setEditingId(null);
        fetchExpenses();
      } else {
        setModalError(data.message || 'Something went wrong.');
      }
    } catch (err) {
      setModalError('Server error while saving expense.');
    } finally {
      setSaving(false);
    }
  };

  // DATA INTEGRITY: Secure deletion routine requiring an explicit ID match and token verification.
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/expenses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok) {
        showMessage('Expense deleted successfully!', 'success');
        fetchExpenses();
      } else {
        showMessage(data.message || 'Cannot delete expense.', 'error');
      }
    } catch (err) {
      showMessage('Server error while deleting expense.', 'error');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const getCategoryName = (exp) => exp.category?.name || '—';
  const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

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

      {/* HEADER SECTION */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '20px', fontWeight: '600' }}>Expenses</h2>
        <button className="btn btn-primary" onClick={openAddModal}>+ Add Expense</button>
      </div>

      {/* TABLE SECTION */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
       

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--header)' }}>
                <th style={{ width: '6%', padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Sr#</th>
                <th style={{ width: '12%', padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Date</th>
                <th style={{ width: '15%', padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Category</th>
                <th style={{ width: '22%', padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Expense Name</th>
                <th style={{ width: '15%', padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Amount</th>
                <th style={{ width: '15%', padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Added By</th>
                <th style={{ width: '15%', padding: '12px 16px', color: 'white', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No expenses recorded yet.</td></tr>
              ) : (
                expenses.map((exp, index) => (
                  <tr key={exp._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left' }}>{index + 1}</td>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left' }}>{new Date(exp.date).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left' }}>{getCategoryName(exp)}</td>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left', fontWeight: '500' }}>{exp.expenseName}</td>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--danger)', textAlign: 'left', fontWeight: '600' }}>Rs. {exp.amount.toFixed(2)}</td>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left' }}>{exp.addedBy}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button style={styles.iconBtnView} onClick={() => startView(exp)} title="View">
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        </button>
                        <button style={styles.iconBtnEdit} onClick={() => openEditModal(exp)} title="Edit">
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button style={styles.iconBtnDelete} onClick={() => setDeleteConfirmId(exp._id)} title="Delete">
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {expenses.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: 'var(--bg-app)', borderTop: '2px solid var(--border-color)' }}>
                  <td colSpan="4" style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', textAlign: 'right' }}>Total Expenses:</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '700', color: 'var(--danger)', textAlign: 'left' }}>Rs. {totalAmount.toFixed(2)}</td>
                  <td colSpan="2"></td>                 
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ADD/EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? 'Edit Expense' : 'Add Expense'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {modalError && (
                <div style={{ marginBottom: '16px', padding: '10px 14px', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '13px', fontWeight: 500, borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger)', textAlign: 'center' }}>
                  ⚠️ {modalError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Expense Category *</label>
                  <select className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Expense Name *</label>
                  <input type="text" className="form-input" placeholder="e.g. Office Rent, Electricity Bill" value={form.expenseName} onChange={(e) => setForm({ ...form, expenseName: e.target.value })} />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Date *</label>
                  <input type="date" className="form-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Amount *</label>
                  <input type="number" min="0" className="form-input" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }} />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Added By *</label>
                  <input type="text" className="form-input" placeholder="Enter name" value={form.addedBy} onChange={(e) => setForm({ ...form, addedBy: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }} />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Description</label>
                  <textarea className="form-input" style={{ minHeight: '80px', resize: 'vertical' }} placeholder="Optional notes..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewExpense && (
        <div className="modal-overlay" onClick={() => setViewExpense(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ padding: 0 }}>
            
            <div style={{ backgroundColor: 'var(--primary)', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '70px', height: '70px', backgroundColor: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' }}>
                💸
              </div>
              <h3 style={{ color: 'white', margin: 0, fontSize: '18px' }}>{viewExpense.expenseName}</h3>
            </div>

            <div className="modal-body" style={{ padding: '24px', maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Category</label>
                  <p style={{ fontSize: '14px', margin: '4px 0 0', color: 'var(--text-main)', wordBreak: 'break-word' }}>{getCategoryName(viewExpense)}</p>
                </div>
                <div>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Date</label>
                  <p style={{ fontSize: '14px', margin: '4px 0 0', color: 'var(--text-main)' }}>{new Date(viewExpense.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Amount</label>
                  <p style={{ fontSize: '14px', margin: '4px 0 0', color: 'var(--danger)', fontWeight: 700 }}>Rs. {viewExpense.amount?.toFixed(2)}</p>
                </div>
                <div>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Added By</label>
                  <p style={{ fontSize: '14px', margin: '4px 0 0', color: 'var(--text-main)' }}>{viewExpense.addedBy}</p>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Description</label>
                <div style={{ marginTop: '6px', padding: '12px', minHeight: '70px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-main)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {viewExpense.description || 'N/A'}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
              <button className="btn btn-secondary" onClick={() => setViewExpense(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="modal-header" style={{ justifyContent: 'center', borderBottom: 'none', paddingBottom: 0 }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, margin: '0 auto' }}>
                !
              </div>
            </div>
            <div className="modal-body">
              <h3 style={{ margin: '0 0 8px', color: 'var(--text-main)', fontSize: '18px' }}>Delete Expense</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>Are you sure you want to delete this expense? This action cannot be undone.</p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center', borderTop: 'none', backgroundColor: 'transparent' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirmId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  iconBtnView: {
    backgroundColor: 'var(--view)',
    color: 'var(--success)',
    border: 'none',
    padding: '6px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  iconBtnEdit: {
   background: 'var(--edit)',
    color: 'var(--primary)',
    border: 'none',
    padding: '6px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  iconBtnDelete: {
    backgroundColor: 'var(--danger-bg)',
    color: 'var(--danger)',
    border: 'none',
    padding: '6px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  }
};

export default Expense;