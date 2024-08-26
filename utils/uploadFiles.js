// utils/uploadFile.js
const { bucket } = require('../config/firebase'); // Import bucket from firebase.js

const uploadFile = async (file, fileName) => {
  const fileUpload = bucket.file(fileName);

  await fileUpload.save(file.data, {
    metadata: {
      contentType: file.mimetype
    }
  });

  const [url] = await fileUpload.getSignedUrl({
    action: 'read',
    expires: '03-09-2491'
  });

  return url;
};

module.exports = uploadFile;
