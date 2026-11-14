import { Router } from "express";
import {
  adminDeleteApplication, adminUpdateApplication, completeApplication, dashboardStats,
  datasetHistory, deleteDatasetBatch, downloadEk17, exportApplications, listApplications, reportStats, uploadTestDataset,
} from "../controllers/adminController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { uploadDataset } from "../middleware/upload.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("admin"));
adminRouter.get("/stats", asyncHandler(dashboardStats));
adminRouter.get("/reports", asyncHandler(reportStats));
adminRouter.get("/datasets", asyncHandler(datasetHistory));
adminRouter.delete("/datasets/:batch", asyncHandler(deleteDatasetBatch));
adminRouter.get("/applications/export.csv", asyncHandler(exportApplications));
adminRouter.get("/applications", asyncHandler(listApplications));
adminRouter.post("/dataset", uploadDataset, asyncHandler(uploadTestDataset));
adminRouter.patch("/applications/:id", asyncHandler(adminUpdateApplication));
adminRouter.delete("/applications/:id", asyncHandler(adminDeleteApplication));
adminRouter.post("/applications/:id/complete", asyncHandler(completeApplication));
adminRouter.get("/applications/:id/ek17", asyncHandler(downloadEk17));
