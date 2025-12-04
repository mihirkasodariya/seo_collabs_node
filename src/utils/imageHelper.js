import multer from "multer";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

// ----------------- Save file locally -----------------
const saveLocally = async (file, folderName, filePrefix, fieldname) => {
  const timestamp = Date.now();
  const first4Chars = file.originalname.slice(0, 4);
  const ext = file.originalname.includes(".")
    ? file.originalname.slice(file.originalname.lastIndexOf("."))
    : ".jpg";
  const filename = `${filePrefix}-${timestamp}-${first4Chars}${ext}`;
  const localFolder = path.join(process.cwd(), "public", folderName);

  if (!fs.existsSync(localFolder)) fs.mkdirSync(localFolder, { recursive: true });

  const filePath = path.join(localFolder, filename);
  fs.writeFileSync(filePath, file.buffer);

  const fileUrl = `http://192.168.1.7:3000:${process.env.PORT || 3000}/${folderName}/${filename}`;
  console.log("Saved file:", fileUrl);

  return {
    field: fieldname,
    fileName: filename,
    originalName: file.originalname,
    url: fileUrl,
  };
};

// ----------------- Multer uploader -----------------
const storage = multer.memoryStorage();

export const createLocalUploader = ({
  folderName,
  filePrefix = "",
  fieldType = "single",
  fieldName,
  customFields = [],
  fileSizeMB = 2,
} = {}) => {
  const limits = { fileSize: fileSizeMB * 1024 * 1024 };
  const upload = multer({ storage, limits });

  let multerUpload;
  if (fieldType === "single") multerUpload = upload.single(fieldName);
  else if (fieldType === "array") multerUpload = upload.array(fieldName, customFields?.[0]?.maxCount || 1);
  else if (fieldType === "fields") multerUpload = upload.fields(customFields);
  else throw new Error("Invalid fieldType for uploader");

  return [
    multerUpload,
    async (req, res, next) => {
      try {
        const files = req.files || (req.file ? { [fieldName]: [req.file] } : {});
        req.uploadedImages = [];

        for (const [key, fileArray] of Object.entries(files)) {
          for (const file of fileArray) {
            const localFile = await saveLocally(file, folderName, filePrefix, key);

            req.uploadedImages.push(localFile);

            // Assign dynamically in req.body using key (fieldName)
            if (fieldType === "single") {
              req.body[key] = localFile.url; // single => string
            } else {
              if (!req.body[key]) req.body[key] = [];
              req.body[key].push(localFile.url); // multiple => array
            }
          }
        }

        next();
      } catch (error) {
        console.error("[Upload] Error during file upload:", error);
        next(error);
      }
    },
  ];
};


export const profileImage = createLocalUploader({
  folderName: "profile",
  filePrefix: "img",
  fieldType: "single",
  fieldName: "img",
  fileSizeMB: 1,
});

const dynamicFeatureFields = Array.from({ length: 20 }, (_, i) => ({
  name: `features[${i}].icon`,
  maxCount: 1,
}));

export const planIconsImage = createLocalUploader({
  folderName: "icon",
  filePrefix: "icon",
  fieldType: "fields",
  customFields: dynamicFeatureFields,
  fileSizeMB: 2,
});

