import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

export const setupTestAuth = () => {
  const User = mongoose.model('User');
  
  const mockUser = {
    _id: new mongoose.Types.ObjectId(),
    status: 'Active',
    role: { role: 'Admin' } 
  };

  const authSpy = jest.spyOn(User, 'findById').mockReturnValue({
    populate: jest.fn().mockResolvedValue(mockUser)
  });

  const secret = process.env.JWT_SECRET || 'secret'; 
  const token = jwt.sign({ id: mockUser._id, email: 'admin@stockify.com' }, secret, { expiresIn: '1h' });

  return { 
    token, 
    userId: mockUser._id.toString(), 
    cleanup: () => authSpy.mockRestore() 
  };
};