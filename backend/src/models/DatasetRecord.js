import mongoose from "mongoose";

const datasetRecordSchema = new mongoose.Schema({
  studentNo: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  identityNo: { type: String, trim: true },
  nationality: { type: String, trim: true },
  birthDate: Date,
  address: { type: String, trim: true },
  department: { type: String, trim: true },
  academicYear: { type: String, trim: true },
  previousInternshipDays: { type: Number, default: 0 },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  healthStatus: { type: Number, min: 1, max: 6 },
  importBatch: { type: String, required: true, index: true },
  importedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

datasetRecordSchema.index({ studentNo: 1, importBatch: 1 }, { unique: true });

export const DatasetRecord = mongoose.model("DatasetRecord", datasetRecordSchema);
