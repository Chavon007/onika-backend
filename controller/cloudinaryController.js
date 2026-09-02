import cloudinary from "../config/cloudinary.js";

const getCloudinarySignature = async (req, res) => {
  try {
    const folder = req.query.folder;

    if (!folder) {
      return res.status(400).json({
        success: false,
        message: "folder query param is required",
      });
    }

    const timestamp = Math.round(Date.now() / 1000);

    const paramsToSign = {
      timestamp,
      folder,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET,
    );

    res.status(200).json({
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export default getCloudinarySignature;
