const multer = require("multer");
const fs = require("fs");
const path = require("path");

const UserDynamicfile = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const listingId = req.listingId
    const userDirectory = path.join(__dirname, `../uploads/media/${listingId}`);
    UserDynamicfile(userDirectory);
    cb(null, userDirectory);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/png", "image/jpg", "image/jpeg", "image/gif", "image/webp",
    "video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo",
    "video/x-ms-wmv", "video/x-matroska", "video/x-flv", "video/x-ms-asf",
    "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

module.exports = upload;
