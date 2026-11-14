import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  originalName: String,
  mimeType: String,
  size: Number,
  sha256: String,
  data: { type: Buffer, select: false },
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  status: {
    type: String,
    enum: ["draft", "uploaded", "reviewing", "error", "approved", "completed"],
    default: "draft",
    index: true,
  },
  stage: { type: String, enum: ["midterm", "final"], default: "midterm" },
  manualData: { type: mongoose.Schema.Types.Mixed, default: {} },
  extractedData: { type: mongoose.Schema.Types.Mixed, default: {} },
  extractionMeta: { type: mongoose.Schema.Types.Mixed, default: {} },
  comparisonReport: { type: [mongoose.Schema.Types.Mixed], default: [] },
  validationReport: { type: [mongoose.Schema.Types.Mixed], default: [] },
  readiness: { type: Boolean, default: false },
  selectedWeekdays: { type: [Number], default: [] },
  internshipStart: Date,
  internshipEnd: Date,
  calculatedInternshipDays: Number,
  document: fileSchema,
  googleForm: {
    url: String,
    entryMap: { type: Map, of: String },
    submittedAt: Date,
    lastError: String,
  },
  completedAt: Date,
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true, minimize: false });

applicationSchema.index({ student: 1, createdAt: -1 });

applicationSchema.methods.assertStudentMutable = function assertStudentMutable() {
  if (this.status === "completed") {
    const error = new Error("Tamamlanan başvuru öğrenci tarafından değiştirilemez.");
    error.statusCode = 409;
    throw error;
  }
};

applicationSchema.set("toJSON", {
  transform(_doc, ret) {
    if (ret.document) delete ret.document.data;
    return ret;
  },
});

export const Application = mongoose.model("Application", applicationSchema);
