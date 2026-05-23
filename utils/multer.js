const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/image/uploads/')
  },
  filename: function (req, file, cb) {
    const fn = crypto.randomBytes(10).toString('hex')+ path.extname(file.originalname);
    console.log(fn);
    
    cb(null, fn);
  }
})

const upload = multer({ storage: storage })
module.exports = upload;