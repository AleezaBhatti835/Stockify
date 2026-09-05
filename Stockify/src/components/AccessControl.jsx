import React, { useState, useEffect } from 'react';

const PERMISSION_GROUPS = [
  {
    id: 'dashboard', moduleName: 'Dashboard', icon: '📊',
    submodules: [
      { id: 'dashboard_view', name: 'Dashboard' }
    ]
  },
  {
    id: 'people', moduleName: 'People', icon: '👥',
    submodules: [
      { id: 'customers_view', name: 'Customers' },
      { id: 'suppliers_view', name: 'Suppliers' },
      { id: 'employees_view', name: 'Employees' }
    ]
  },
  {
    id: 'products', moduleName: 'Products', icon: '📦',
    submodules: [
      { id: 'uom_view', name: 'Units of Measure' },
      { id: 'categories_view', name: 'Categories' },
      { id: 'products_view', name: 'Products' }
    ]
  },
  {
    id: 'stock', moduleName: 'Stock', icon: '🧊',
    submodules: [
      { id: 'current_stock_view', name: 'Current Stock' },
      { id: 'expiry_products_view', name: 'Expiry Products' },
      { id: 'reorder_levels', name: 'Reorder Levels' },
      { id: 'opening_stocks', name: 'Opening Stock' },
      { id: 'stock_adjustment', name: 'Stock Adjustment' },
      { id: 'stock_breakage', name: 'Stock Breakage' }
    ]
  },
  {
    id: 'purchase', moduleName: 'Purchases', icon: '🛒',
    submodules: [
      { id: 'add_purchase_view', name: 'Purchase Invoice (Add)' },
      { id: 'purchase_list_view', name: 'Purchase Invoice List' },
      { id: 'add_purchase_return_view', name: 'Purchase Return' },
      { id: 'purchase_return_list_view', name: 'Purchase Return List' },
      { id: 'add_purchase_rebate_view', name: 'Purchase Rebate' },
      { id: 'purchase_rebate_list_view', name: 'Purchase Rebate List' },
      { id: 'add_purchase_rate_diff_view', name: 'Rate Difference' },
      { id: 'purchase_rate_diff_list_view', name: 'Rate Difference List' }
    ]
  },
  {
    id: 'sales', moduleName: 'Sales', icon: '🪙',
    submodules: [
      { id: 'pos_access_view', name: 'POS' },
      { id: 'invoice_list_view', name: 'Invoice List' },
      { id: 'cash_register_view', name: 'Cash Register' },
      { id: 'add_sales_return_view', name: 'Sales Return' },
      { id: 'sales_return_list_view', name: 'Sale Return List' },
      { id: 'add_sales_rebate_view', name: 'Sales Rebate' },
      { id: 'sales_rebate_list_view', name: 'Sales Rebate List' },
      { id: 'add_sales_rate_diff_view', name: 'Sales Rate Difference' },
      { id: 'sales_rate_diff_list_view', name: 'Sales Rate Difference List' }
    ]
  },
  {
    id: 'accounts', moduleName: 'Accounts', icon: '💰',
    submodules: [
      { id: 'customer_account_view', name: 'Customer Account Ledger' },
      { id: 'supplier_account_view', name: 'Supplier Account Ledger' },
      { id: 'employee_account_view', name: 'Employee Account Ledger' }
    ]
  },
  {
    id: 'expenses', moduleName: 'Expenses', icon: '💸',
    submodules: [
      { id: 'expense_category_view', name: 'Expense Categories' },
      { id: 'expenses_view', name: 'Manage Expenses' }
    ]
  },
  {
    id: 'reports', moduleName: 'Reports', icon: '📈',
    submodules: [
      { id: 'report_people_view', name: 'People Report' },
      { id: 'report_catalogue_view', name: 'Catalogue Report' },
      { id: 'report_stock_view', name: 'Stock Report' },
      { id: 'report_purchase_view', name: 'Purchase Report' },
      { id: 'report_sales_view', name: 'Sales Report' },
      { id: 'report_register_view', name: 'Register Report' },
      { id: 'report_stock_movement_view', name: 'Stock Movement Report' },
      { id: 'report_accounts_view', name: 'Accounts Report' },
      { id: 'report_payable_receivable_view', name: 'Payable and Receivable' },
      { id: 'report_profit_loss_view', name: 'Profit & Loss Report' },
      { id: 'report_business_capital_view', name: 'Business Capital Report' }
    ]
  },
  {
    id: 'system', moduleName: 'System Users', icon: '🧑‍💼',
    submodules: [
      { id: 'users_view', name: 'Manage Users' },
      { id: 'roles_view', name: 'Manage Roles' }
    ]
  },
  {
    id: 'settings', moduleName: 'Settings', icon: '⚙️',
    submodules: [
      { id: 'designations_view', name: 'Designations' },
      { id: 'print_settings_view', name: 'Sale Invoice' },
      { id: 'client_details_view', name: 'Client Details' },
      { id: 'customer_types_view', name: 'Customer Types' },
      { id: 'access_control_view', name: 'Access Control' }
    ]
  }
];

const AccessControl = () => {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [activePermissions, setActivePermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/roles', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || data.data || []);
      }
    } catch (error) {
      showMessage('Failed to fetch roles from server.', 'error');
    }
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setActivePermissions(role.permissions || []);
    setMessage({ text: '', type: '' });
    setIsModalOpen(true); 
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedRole(null);
      setActivePermissions([]);
    }, 300); 
  };

  const toggleSubmodule = (subId) => {
    if (selectedRole?.role?.toLowerCase() === 'admin') return;

    setActivePermissions(prev => 
      prev.includes(subId) 
        ? prev.filter(id => id !== subId) 
        : [...prev, subId]
    );
  };

  const toggleGroup = (group) => {
    if (selectedRole?.role?.toLowerCase() === 'admin') return;

    const groupIds = group.submodules.map(s => s.id);
    const allChecked = groupIds.every(id => activePermissions.includes(id));

    if (allChecked) {
      setActivePermissions(prev => prev.filter(id => !groupIds.includes(id)));
    } else {
      const newPerms = new Set([...activePermissions, ...groupIds]);
      setActivePermissions(Array.from(newPerms));
    }
  };

  const handleToggleAll = () => {
    if (selectedRole?.role?.toLowerCase() === 'admin') return;

    const allSubmoduleIds = PERMISSION_GROUPS.flatMap(group => group.submodules.map(s => s.id));
    const allAreChecked = allSubmoduleIds.every(id => activePermissions.includes(id));

    if (allAreChecked) {
      setActivePermissions([]);
    } else {
      setActivePermissions(allSubmoduleIds);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole || selectedRole.role.toLowerCase() === 'admin') return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      let expandedPermissions = [];
      activePermissions.forEach(perm => {
        expandedPermissions.push(perm);
        
        if (['current_stock_view', 'expiry_products_view', 'reorder_levels', 'opening_stocks'].includes(perm)) {
            expandedPermissions.push('products_view', 'products_add', 'products_edit', 'products_delete');
        }
        if (['add_purchase_view', 'purchase_list_view'].includes(perm)) {
            expandedPermissions.push('purchases_view', 'purchases_add', 'purchases_edit', 'purchases_delete');
        }
        if (['add_purchase_return_view', 'purchase_return_list_view'].includes(perm)) {
            expandedPermissions.push('purchase_returns_view', 'purchase_returns_add', 'purchase_returns_edit', 'purchase_returns_delete');
        }
        if (['add_purchase_rebate_view', 'purchase_rebate_list_view'].includes(perm)) {
            expandedPermissions.push('purchase_rebates_view', 'purchase_rebates_add');
        }
        if (['add_purchase_rate_diff_view', 'purchase_rate_diff_list_view'].includes(perm)) {
            expandedPermissions.push('purchase_rate_difference_view', 'purchase_rate_difference_add');
        }
        if (['pos_access_view', 'invoice_list_view'].includes(perm)) {
            expandedPermissions.push('pos_view', 'pos_add', 'pos_edit', 'pos_delete');
        }
        if (['add_sales_return_view', 'sales_return_list_view'].includes(perm)) {
            expandedPermissions.push('sale_returns_view', 'sale_returns_add');
        }
        if (['add_sales_rebate_view', 'sales_rebate_list_view'].includes(perm)) {
            expandedPermissions.push('sales_rebates_view', 'sales_rebates_add');
        }
        if (['add_sales_rate_diff_view', 'sales_rate_diff_list_view'].includes(perm)) {
            expandedPermissions.push('sale_rate_difference_view', 'sale_rate_difference_add');
        }
        if (['expenses_view'].includes(perm)) {
            expandedPermissions.push('expenses_view', 'expenses_add', 'expenses_edit', 'expenses_delete');
        }
        if (['designations_view', 'print_settings_view', 'client_details_view', 'customer_types_view', 'access_control_view'].includes(perm)) {
            expandedPermissions.push('settings_view', 'settings_edit', 'customers_view', 'customers_add');
        }
        if (perm === 'cash_register_view') {
            expandedPermissions.push('cash_register_manage');
        }

        if (perm.endsWith('_view')) {
          const base = perm.replace('_view', '');
          expandedPermissions.push(`${base}_add`, `${base}_edit`, `${base}_delete`);
        }
      });
      
      expandedPermissions = [...new Set(expandedPermissions)];

      const res = await fetch(`http://localhost:5000/api/roles/${selectedRole._id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ permissions: expandedPermissions })
      });

      if (res.ok) {
        const updatedRole = await res.json();
        setRoles(roles.map(r => r._id === updatedRole._id ? updatedRole : r));
        setSelectedRole(updatedRole);
        showMessage(`Permissions updated successfully!`, 'success');
        setTimeout(() => handleCloseModal(), 1000); 
      } else {
        showMessage('Failed to update permissions.', 'error');
      }
    } catch (error) {
      showMessage('Network error while saving permissions.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const allSubmoduleIds = PERMISSION_GROUPS.flatMap(group => group.submodules.map(s => s.id));
  const isAllChecked = allSubmoduleIds.length > 0 && allSubmoduleIds.every(id => activePermissions.includes(id));

  return (
    <div className="dashboard-wrapper">
      <div className="card" style={{ marginBottom: '20px' }}>
        <h2 style={{ color: 'var(--text-main)', fontSize: '20px', fontWeight: '600', margin: '0 0 6px 0' }}>System Roles & Access</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Select a role card to configure its detailed permissions.</p>
      </div>

      {!isModalOpen && message.text && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '20px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: message.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)',
          color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
          border: `1px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}`,
          fontSize: '14px',
          fontWeight: 500
        }}>
          {message.text}
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '20px' 
      }}>
        {roles.map(role => {
          const isAdmin = role.role.toLowerCase() === 'admin';
          return (
            <div 
              key={role._id} 
              onClick={() => handleRoleSelect(role)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '20px',
                backgroundColor: 'white',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => { 
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.borderColor = 'var(--primary)';
              }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >


              {/* Icon Container */}
              <div style={{
                width: '46px', height: '46px', borderRadius: '12px', 
                backgroundColor: isAdmin ? '#fef2f2' : 'var(--primary-light)', 
                color: isAdmin ? '#ef4444' : 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
                boxShadow: 'inset 0 4px 4px rgba(226, 243, 237, 0.91)'
              }}>
                {isAdmin ? '👑' : '⫸'}
              </div>

              {/* Text Content */}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', color: 'var(--text-main)', fontWeight: '700', letterSpacing: '0.3px' }}>
                  {role.role}
                </h3>
                <span style={{ 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: isAdmin ? '#ef4444' : 'var(--primary-other)',
                    backgroundColor: isAdmin ? '#fef2f2' : 'var(--primary-light)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                }}>
                  {isAdmin ? 'Full System Access' : 'Custom Permissions'}
                </span>
              </div>
              
              <div style={{ fontSize: '24px', color: '#cbd5e1', fontWeight: 'bold' }}>›</div>
            </div>
          );
        })}
      </div>

      {isModalOpen && selectedRole && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div 
            className="modal-container" 
            onClick={(e) => e.stopPropagation()} 
            style={{ width: '92%', maxWidth: '960px', height: '88vh', display: 'flex', flexDirection: 'column' }}
          >
            
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h3 className="modal-title" style={{ fontSize: '18px' }}>
                  Role Permissions: <span style={{ color: 'var(--primary)' }}>{selectedRole.role}</span>
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Check the modules and submodules this role can access.</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {selectedRole.role.toLowerCase() !== 'admin' && (
                  <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', 
                    backgroundColor: 'var(--bg-app)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', 
                    border: '1px solid var(--border-color)' 
                  }} onClick={handleToggleAll}>
                    <input 
                      type="checkbox" 
                      checked={isAllChecked} 
                      onChange={() => {}} 
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Check All</span>
                  </div>
                )}
                <button className="modal-close" onClick={handleCloseModal}>✕</button>
              </div>
            </div>

            <div className="modal-body" style={{ backgroundColor: 'var(--bg-app)', flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {message.text && (
                <div style={{
                  padding: '12px 16px',
                  marginBottom: '20px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: message.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)',
                  color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
                  border: `1px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}`,
                  fontSize: '14px',
                  fontWeight: 500
                }}>
                  {message.text}
                </div>
              )}
              {selectedRole.role.toLowerCase() === 'admin' ? (
                <div style={{ textAlign: 'center', padding: '50px', backgroundColor: 'var(--primary)', color: '#fff', borderRadius: 'var(--radius-md)' }}>
                  <h3 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>👑 Full Control</h3>
                  <p style={{ margin: 0, opacity: 0.9 }}>Admin role has permanent access to all sections.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
                  {PERMISSION_GROUPS.map(group => {
                    const groupIds = group.submodules.map(s => s.id);
                    const allChecked = groupIds.every(id => activePermissions.includes(id));
                    
                    return (
                      <div key={group.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ backgroundColor: 'var(--bg-app)', padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }} onClick={() => toggleGroup(group)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input 
                              type="checkbox" 
                              checked={allChecked} 
                              onChange={() => {}} 
                              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                            />
                            <span style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '13px' }}>
                              {group.icon} {group.moduleName}
                            </span>
                          </div>
                        </div>

                        <div style={{ padding: '8px 16px' }}>
                          {group.submodules.map(sub => {
                            const isChecked = activePermissions.includes(sub.id);
                            return (
                              <div 
                                key={sub.id} 
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', cursor: 'pointer' }}
                                onClick={() => toggleSubmodule(sub.id)}
                              >
                                <input 
                                  type="checkbox" 
                                  checked={isChecked} 
                                  onChange={() => {}} 
                                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                />
                                <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '500' }}>{sub.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ flexShrink: 0 }}>
              <button className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
              {selectedRole.role.toLowerCase() !== 'admin' && (
                <button 
                  onClick={handleSavePermissions} 
                  disabled={loading} 
                  className="btn btn-primary"
                  style={loading ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                >
                  {loading ? 'Saving...' : '💾 Save Permissions'}
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default AccessControl;