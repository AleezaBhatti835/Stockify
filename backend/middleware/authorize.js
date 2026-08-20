import User from '../models/user.js';

export const authorize = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // Frontend ko har API request ke headers mein 'x-user-id' bhejna hoga
      const userId = req.headers['x-user-id']; 

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: User ID missing in headers' });
      }

      const user = await User.findById(userId).populate('role');
      
      if (!user || user.status === 'Inactive') {
        return res.status(401).json({ success: false, message: 'Unauthorized: User not found or inactive' });
      }

      // Agar user "Admin" hai, tou usey hamesha pass hone dein
      if (user.role && user.role.role.toLowerCase() === 'admin') {
        req.user = user;
        return next();
      }

      // Agar role admin nahi hai, tou specific permission check karein
      const userPermissions = user.role?.permissions || [];
      if (requiredPermission && !userPermissions.includes(requiredPermission)) {
        return res.status(403).json({ 
          success: false, 
          message: `Forbidden: You do not have the '${requiredPermission}' permission.` 
        });
      }

      // Agar permission match ho jaye tou request aagay pass kar dein
      req.user = user;
      next();
    } catch (error) {
      console.error('Authorization Middleware Error:', error);
      return res.status(500).json({ success: false, message: 'Server authorization error' });
    }
  };
};