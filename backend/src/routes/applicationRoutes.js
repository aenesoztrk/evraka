import { Router } from "express";
import {
  createApplication, downloadDocument, getApplication, listMine, saveGoogleForm,
  updateManualData, updateSchedule, uploadEk16,
} from "../controllers/applicationController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { uploadDocument } from "../middleware/upload.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const applicationRouter = Router();

applicationRouter.use(requireAuth);
applicationRouter.post("/", requireRole("student"), asyncHandler(createApplication));
applicationRouter.get("/mine", requireRole("student"), asyncHandler(listMine));
applicationRouter.get("/:id", asyncHandler(getApplication));
applicationRouter.patch("/:id/manual", asyncHandler(updateManualData));
applicationRouter.post("/:id/document", uploadDocument, asyncHandler(uploadEk16));
applicationRouter.patch("/:id/schedule", asyncHandler(updateSchedule));
applicationRouter.put("/:id/google-form", asyncHandler(saveGoogleForm));
applicationRouter.get("/:id/document", asyncHandler(downloadDocument));
