import { useState, useEffect } from 'react';
import '../roles.css';

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
    const [originalForm, setOriginalForm] = useState(null); // 🔥 Track original data for edit check
    const [saving, setSaving] = useState(false);
    const [modalError, setModalError] = useState(''); // 🔥 Inline error state for Modal

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
            const res = await fetch(`${API_BASE_URL}/api/expenses`);
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
            const res = await fetch(`${API_BASE_URL}/api/expense-categories`);
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
        setModalError(''); // Clear previous errors
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
        setOriginalForm(editData); // Save original data to check later
        setModalError(''); // Clear previous errors
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

    const handleSave = async () => {
        setModalError(''); // Clear error on new save attempt
        
        const error = validate();
        if (error) {
            setModalError(error);
            return;
        }

        // 🔥 Check if anything actually changed during Edit
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
            const url = editingId ? `${API_BASE_URL}/api/expenses/${editingId}` : `${API_BASE_URL}/api/expenses`;
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
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

    const handleDelete = async (id) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/expenses/${id}`, { method: 'DELETE' });
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

    return (
        <div style={styles.wrapper}>
            {/* Success Global Toast */}
            {message.text && message.type === 'success' && (
                <div style={{
                    position: 'fixed', top: '24px', right: '24px', zIndex: 1000000,
                    padding: '16px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    background: '#ecfdf5', color: '#10b981', border: '1px solid #34d399',
                    display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.3s'
                }}>
                    ✅ {message.text}
                </div>
            )}

            <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '22px',fontWeight:'400px', color: '#3e576c', fontFamily: 'times new roman' }}>Expenses</h3>
                    <button style={styles.addBtn} onClick={openAddModal}>+ Add Expense</button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className='roles-table' style={{ width: '80%', marginLeft: '27px', marginTop: '30px' }}>
                        <thead>
                            <tr>
                                <th style={{ ...styles.th, width: '7%' }}>Sr#</th>
                                <th style={{ ...styles.th, width: '15%' }}>Date</th>
                                <th style={{ ...styles.th, width: '13%' }}>Category</th>
                                <th style={{ ...styles.th, width: '16%' }}>Expense Name</th>
                                <th style={{ ...styles.th, textAlign: 'left', width: '16%', paddingLeft: '20px' }}>Amount</th>
                                <th style={{ ...styles.th, width: '14%' }}>Added By</th>
                                <th style={{ ...styles.th, textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" style={styles.emptyCell}>Loading...</td></tr>
                            ) : expenses.length === 0 ? (
                                <tr><td colSpan="7" style={styles.emptyCell}>No expenses recorded yet.</td></tr>
                            ) : (
                                expenses.map((exp, index) => (
                                    <tr key={exp._id}>
                                        <td style={{ ...styles.td, width: '7%' }}>{index + 1}</td>
                                        <td style={styles.td}>{new Date(exp.date).toLocaleDateString()}</td>
                                        <td style={styles.td}>{getCategoryName(exp)}</td>
                                        <td style={{ ...styles.td, fontWeight: 600 }}>{exp.expenseName}</td>
                                        <td style={{ ...styles.td, textAlign: 'left', paddingLeft: '20px', fontWeight: 600, color: '#ef4444' }}>
                                            Rs. {exp.amount.toFixed(2)}
                                        </td>
                                        <td style={styles.td}>{exp.addedBy}</td>
                                        <td style={{ ...styles.td, textAlign: 'center' }}>
                                            
                                            <div style={styles.actionGroup}>
                                                {/* View Button */}
                                                <button style={styles.iconBtnView} onClick={() => startView(exp)} title="View">
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                        <circle cx="12" cy="12" r="3"></circle>
                                                    </svg>
                                                </button>

                                                {/* Edit Button */}
                                                <button style={styles.iconBtnEdit} onClick={() => openEditModal(exp)} title="Edit">
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                    </svg>
                                                </button>

                                                {/* Delete Button */}
                                                <button
                                                    style={styles.iconBtnDelete}
                                                    onClick={() => setDeleteConfirmId(exp._id)}
                                                    title="Delete"
                                                >
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
                                <tr>
                                    <td colSpan="4" style={styles.footerLabel}>Total Expenses:</td>
                                    <td style={{ ...styles.footerValue, textAlign: 'left', paddingLeft: '20px' }}>Rs. {totalAmount.toFixed(2)}</td>
                                    <td colSpan="2"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* ==================== COMPACT ADD/EDIT MODAL ==================== */}
            {isModalOpen && (
                <div style={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                    {/* 🔥 MODAL CONTENT FIXED: MaxHeight & Flex Column to prevent cutoff 🔥 */}
                    <div style={{ ...styles.modalContent, maxWidth: '500px', border: '2px solid #cbd5e1', padding: 0, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
                        
                        {/* Modal Header (Fixed at top) */}
                        <div style={{ ...styles.modalHeader, padding: '16px 20px', backgroundColor: '#f8fafc', borderTopLeftRadius: '10px', borderTopRightRadius: '10px', flexShrink: 0 }}>
                            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>{editingId ? 'Edit Expense' : 'Add Expense'}</h3>
                            <button style={styles.closeBtn} onClick={() => setIsModalOpen(false)}>×</button>
                        </div>

                        {/* Modal Body (Scrollable if content is too long) */}
                        <div style={{ overflowY: 'auto', padding: '20px' }}>
                            
                            {/* 🔥 INLINE ERROR MESSAGE CENTERED 🔥 */}
                            {modalError && (
                                <div style={{ marginBottom: '16px', padding: '10px 14px', backgroundColor: '#fef2f2', color: '#ef4444', fontSize: '14px', fontWeight: 600, borderRadius: '6px', border: '1px solid #fecaca', textAlign: 'center' }}>
                                    ⚠️ {modalError}
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={styles.label}>Expense Category *</label>
                                    <select
                                        style={{...styles.input, padding: '8px 12px'}}
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(c => (
                                            <option key={c._id} value={c._id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={styles.label}>Expense Name *</label>
                                    <input
                                        type="text" style={{...styles.input, padding: '8px 12px'}}
                                        placeholder="e.g. Office Rent, Electricity Bill"
                                        value={form.expenseName}
                                        onChange={(e) => setForm({ ...form, expenseName: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label style={styles.label}>Date *</label>
                                    <input
                                        type="date" style={{...styles.input, padding: '8px 12px'}}
                                        value={form.date}
                                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                                    />
                                </div>
                                
                                <div>
                                    <label style={styles.label}>Amount *</label>
                                    <input
                                        type="number" min="0" style={{...styles.input, padding: '8px 12px'}}
                                        placeholder="0"
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                                    />
                                </div>

                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={styles.label}>Added By *</label>
                                    <input
                                        type="text" style={{...styles.input, padding: '8px 12px'}}
                                        placeholder="Enter name"
                                        value={form.addedBy}
                                        onChange={(e) => setForm({ ...form, addedBy: e.target.value })}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                                    />
                                </div>

                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={styles.label}>Description</label>
                                    <textarea
                                        style={{ ...styles.input, padding: '8px 12px', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit', color: '#555' }}
                                        placeholder="Optional notes..."
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer (Fixed at bottom) */}
                        <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px', justifyContent: 'flex-end', backgroundColor: '#f8fafc', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px', flexShrink: 0 }}>
                            <button style={{...styles.cancelBtn, padding: '8px 16px'}} onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button style={{ ...styles.saveBtn, padding: '8px 16px', opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== VIEW MODAL ==================== */}
            {viewExpense && (
                <div style={styles.modalOverlay} onClick={() => setViewExpense(null)}>
                    <div style={{ ...styles.modalContent, height: 'auto', maxWidth: '520px', padding: 0, position: 'relative', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
                        
                        {/* Header Area */}
                        <div style={{
                            backgroundColor: '#5aa7ef', padding: '24px 24px', display: 'flex',
                            flexDirection: 'column', alignItems: 'center', gap: '10px',
                            borderTopLeftRadius: '12px', borderTopRightRadius: '12px', flexShrink: 0
                        }}>
                            <div style={{ 
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', borderRadius: '50%', border: '3px solid white',
                                width: '84px', height: '84px', backgroundColor: '#fff', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' 
                            }}>
                                💸
                            </div>
                            <h3 style={{ color: 'white', margin: 0 }}>{viewExpense.expenseName}</h3>
                        </div>

                        {/* Details */}
                        <div style={{ padding: '24px', overflowY: 'auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
                                <div>
                                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6c757d', fontWeight: 600 }}>Category</label>
                                    <p style={{ fontSize: '0.95rem', margin: '4px 0 0', color: '#212529', wordBreak: 'break-word' }}>{getCategoryName(viewExpense)}</p>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6c757d', fontWeight: 600 }}>Date</label>
                                    <p style={{ fontSize: '0.95rem', margin: '4px 0 0', color: '#212529' }}>{new Date(viewExpense.date).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6c757d', fontWeight: 600 }}>Amount</label>
                                    <p style={{ fontSize: '0.95rem', margin: '4px 0 0', color: '#ef4444', fontWeight: 700 }}>Rs. {viewExpense.amount?.toFixed(2)}</p>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6c757d', fontWeight: 600 }}>Added By</label>
                                    <p style={{ fontSize: '0.95rem', margin: '4px 0 0', color: '#212529' }}>{viewExpense.addedBy}</p>
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6c757d', fontWeight: 600 }}>Description</label>
                                <div style={{
                                    marginTop: '6px', padding: '12px', minHeight: '70px', borderRadius: '8px',
                                    backgroundColor: '#f4f6f8', border: '1px solid #e2e6ea', fontSize: '0.9rem',
                                    color: '#212529', whiteSpace: 'pre-wrap', lineHeight: 1.5
                                }}>
                                    {viewExpense.description || 'N/A'}
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e9ecef', display: 'flex', justifyContent: 'flex-end', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', flexShrink: 0 }}>
                            <button onClick={() => setViewExpense(null)} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== DELETE CONFIRM MODAL ==================== */}
            {deleteConfirmId && (
                <div style={styles.modalOverlay} onClick={() => setDeleteConfirmId(null)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ margin: 0, color: '#0f172a' }}>Delete Expense</h3>
                        <p style={{ color: '#64748b', marginTop: '12px' }}>Are you sure you want to delete this expense?</p>
                        <div style={{ marginTop: '24px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button style={styles.cancelBtn} onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                            <button style={styles.deleteConfirmBtn} onClick={() => handleDelete(deleteConfirmId)}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    wrapper: { display: 'flex', flexDirection: 'column', gap: '16px' },
    card: { background: '#fff', borderRadius: '12px'},
    addBtn: { width: '16%', padding: '10px 20px', color: 'white', backgroundColor: '#5aa7ef', whiteSpace: 'nowrap', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: {
        width: '20%', textAlign: 'left', padding: '12px 15px', backgroundColor: ' #26384a',
        color: '#fdfdfd',
        fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'
    },
    td: { padding: '6px 16px', textAlign: 'left', fontSize: '14px', borderBottom: '1px solid #f3f5f8', color: '#334155' },
    emptyCell: { padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
    footerLabel: { padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#0f172a' },
    footerValue: { padding: '12px 16px', fontWeight: 600, fontSize: '15px', color: '#ef4444'},
    label: { fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block', textAlign: 'left' },
    input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#f8fafc', outline: 'none', boxSizing: 'border-box' },
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 },
    modalContent: { background: '#fff', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' },
    closeBtn: { background: 'none', border: 'none', fontSize: '22px', color: '#64748b', cursor: 'pointer', lineHeight: 1 },
    cancelBtn: { padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: '1px solid #d4d0d0', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 },
    saveBtn: { padding: '10px 20px', background: '#3c4e6b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 },
    deleteConfirmBtn: { padding: '10px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 },

    actionGroup: {
        display: 'flex',
        justifyContent: 'center',
        marginLeft:'0px',
        gap: '12px',
    },
    iconBtnView: {
        background: '#f0fdf4',
        color: '#59956f',
        border: 'none',
        padding: '8px',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.2s',
        backgroundColor:'#e9f2e9'
    },
    iconBtnEdit: {
        background: '#eff6ff',
        color: '#3b82f6',
        border: 'none',
        padding: '8px',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.2s',
    },
    iconBtnDelete: {
        background: '#fef2f2',
        color: '#ef4444',
        border: 'none',
        padding: '8px',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.2s',
    },
};

export default Expense;