const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { enabled: cloudinaryEnabled } = require("./cloudinary");

const UserDynamicfile = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.body.userid; 
    const userDirectory = path.join(__dirname, `../uploads/profile/${userId}`);
    UserDynamicfile(userDirectory);
    
    if (fs.existsSync(userDirectory)) {
      fs.readdirSync(userDirectory).forEach((file) => {
        fs.unlinkSync(path.join(userDirectory, file));
      });
    }
    
    cb(null, userDirectory);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/png", "image/jpg", "image/jpeg", "image/gif", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(null, false); 
  }
};

// Serverless deployments (including Vercel) have a read-only filesystem.
// Keep local development on disk, but keep production uploads in memory so
// the controller can send them to Cloudinary instead of /var/task/uploads.
const profileImage = multer({
  storage: cloudinaryEnabled || process.env.VERCEL === "1"
    ? multer.memoryStorage()
    : storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = profileImage;
