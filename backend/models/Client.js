import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    businessName: { 
      type: String, 
      required: [true, 'Business Name is required'] 
    },
    contact: { 
      type: String, 
      default: '' 
    },
    address: { 
      type: String, 
      default: '' 
    },
    logo: { 
      type: String, 
      default: '' // Yeh Base64 image string ko store karega
    }
  },
  { timestamps: true }
);

export default mongoose.model('Client', clientSchema);