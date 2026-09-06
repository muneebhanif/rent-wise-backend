const cloudinary = require('cloudinary').v2;

const cloudinaryUrl = process.env.CLOUDINARY_URL;
const enabled = Boolean(
  (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) || cloudinaryUrl
);

if (enabled) {
  // The SDK reads CLOUDINARY_URL directly from the environment.
  // Calling config() without overriding it also correctly parses the URL.
  if (cloudinaryUrl) cloudinary.config();
  else cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
}

function uploadFile(file, folder) {
  if (!enabled || !file?.buffer) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: 'auto' }, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    stream.end(file.buffer);
  });
}

module.exports = { enabled, uploadFile };
