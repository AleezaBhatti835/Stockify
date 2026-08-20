export const hasPermission = (permissionKey) => {
  try {
    const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user') || localStorage.getItem('userData');
    
    if (!userStr) {
      const token = localStorage.getItem('token');
      if (token) return true; 
      return false;
    }
    
    const user = JSON.parse(userStr);
    if (!user) return false;

    // 1. Check if role is stored directly as a string
    if (typeof user.role === 'string') {
      if (user.role.trim().toLowerCase() === 'admin') return true;
    }

    // 2. Check if role is a populated object
    if (user.role && typeof user.role === 'object') {
      const roleName = user.role.role || user.role.name || '';
      if (roleName.trim().toLowerCase() === 'admin') return true;
    }

    // 3. Standard granular permission check
    const permissions = user.role?.permissions || user.permissions || [];
    return permissions.includes(permissionKey);
  } catch (e) {
    console.error("Permission check error:", e);
    return false;
  }
};