import path from "node:path";
import { Router } from "express";
import { UPLOADS_DIR } from "../middleware/upload.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/uploads/:filename", requireAuth, (req, res) => {
  const filename = path.basename(req.params.filename);
  if (filename !== req.params.filename || !/^[a-f0-9-]+\.(pdf|jpg|png)$/i.test(filename)) {
    return res.status(404).end();
  }
  return res.sendFile(path.join(UPLOADS_DIR, filename), { headers: { "Content-Disposition": "inline" } }, (error) => {
    if (error && !res.headersSent) res.status(error.statusCode === 404 ? 404 : 500).end();
  });
});

export default router;
