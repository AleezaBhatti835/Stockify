import mongoose from "mongoose";
// Global, single-document print & document settings — the standard
// "Print Settings" form you'd see in most POS/ERP systems.
const printSettingsSchema = new mongoose.Schema(
  {
    // ---- Paper & Printer ----
    paperSize: {
      type: String,
      enum: ['A4', 'A5', 'Thermal58'],
      default: 'A4',
      required: true,
    }},
  { timestamps: true }
);

export default mongoose.model('PrintSettings', printSettingsSchema);