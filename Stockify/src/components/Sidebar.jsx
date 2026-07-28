import { useState } from 'react';
import { Link } from 'react-router-dom';

function Sidebar() {
  // State to manage the collapsible "System Users" menu
  const [isSystemOpen, setIsSystemOpen] = useState(false);

  return (
    <div className="sidebar" style={{ width: '250px', background: '#2c3e50', color: 'white', minHeight: '100vh', padding: '20px' }}>
      <h2>My Dashboard</h2>
      
      <ul style={{ listStyleType: 'none', padding: 0, marginTop: '30px' }}>
        
        {/* PARENT MODULE: SYSTEM USERS */}
        <li style={{ marginBottom: '15px' }}>
          <div 
            onClick={() => setIsSystemOpen(!isSystemOpen)}
            style={{ cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #34495e' }}
          >
            <span>System Users</span>
            <span>{isSystemOpen ? '▼' : '▶'}</span>
          </div>

          {/* SUB-MODULES */}
          {isSystemOpen && (
            <ul style={{ listStyleType: 'none', paddingLeft: '20px', marginTop: '10px' }}>
              <li style={{ margin: '10px 0' }}>
                <Link to="/system/users" style={{ color: '#ecf0f1', textDecoration: 'none' }}>Users</Link>
              </li>
              <li style={{ margin: '10px 0' }}>
                <Link to="/system/roles" style={{ color: '#ecf0f1', textDecoration: 'none' }}>Roles</Link>
              </li>
            </ul>
          )}
        </li>

        {/* CUSTOMERS MODULE */}
        <li style={{ marginBottom: '15px' }}>
          <div style={{ padding: '10px 0', borderBottom: '1px solid #34495e' }}>
            <Link to="/customers" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>
              Customers
            </Link>
          </div>
        </li>

      </ul>
    </div>
  );
}

export default Sidebar;