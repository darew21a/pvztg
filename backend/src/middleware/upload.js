import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import multer from "multer";

const defaultUploadsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../uploads");
export const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || defaultUploadsDir);
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_FILES = new Map([
  ["application/pdf", ".pdf"],
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, UPLOADS_DIR),
  filename: (_req, file, callback) => {
    const extension = ALLOWED_FILES.get(file.mimetype);
    callback(null, `${randomUUID()}${extension}`);
  },
});

function fileFilter(_req, file, callback) {
  if (file.fieldname === "incidentPdf" && file.mimetype !== "application/pdf") {
    return callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
  }
  const extension = path.extname(file.originalname).toLowerCase();
  const allowedExtension = ALLOWED_FILES.get(file.mimetype);
  const extensionMatches = file.mimetype === "image/jpeg"
    ? [".jpg", ".jpeg"].includes(extension)
    : extension === allowedExtension;
  if (!allowedExtension || !extensionMatches) {
    return callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
  }
  return callback(null, true);
}

export const uploadFiles = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 3 },
});

function tieneFirmaValida(buffer, mimetype) {
  if (mimetype === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mimetype === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimetype === "image/jpeg") return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  return false;
}

function obtenerArchivos(req) {
  const archivos = [];
  if (req.file) archivos.push(req.file);
  if (req.files && !Array.isArray(req.files)) {
    Object.values(req.files).forEach((lista) => archivos.push(...lista));
  }
  if (Array.isArray(req.files)) archivos.push(...req.files);
  return archivos;
}

export async function validateUploadedFileSignatures(req, res, next) {
  const archivos = obtenerArchivos(req);
  try {
    for (const file of archivos) {
      const header = await fsPromises.readFile(file.path, { encoding: null, flag: "r" });
      if (!tieneFirmaValida(header, file.mimetype)) {
        await Promise.all(archivos.map((archivo) => fsPromises.unlink(archivo.path).catch((error) => {
          if (error.code !== "ENOENT") throw error;
        })));
        return res.status(400).json({ mensaje: "El contenido del archivo no coincide con su formato declarado." });
      }
    }
    return next();
  } catch (error) {
    console.error("No fue posible validar la firma de los archivos subidos:", error);
    return next(error);
  }
}

export function uploadedFileUrl(file) {
  return file ? `/api/uploads/${encodeURIComponent(file.filename)}` : null;
}
