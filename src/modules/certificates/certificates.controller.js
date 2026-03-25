
const Certificate = require('../../model/certificate.model');

// Lấy danh sách certificate của chính user
async function getMyCertificates(req, res, next) {
  try {
    const certs = await Certificate.find({ user_id: req.user._id }).sort({ issued_at: -1 });
    res.json({ success: true, certificates: certs });
  } catch (err) {
    next(err);
  }
}

// Lấy chi tiết certificate theo ID
async function getCertificateDetail(req, res, next) {
  try {
    const cert = await Certificate.findById(req.params.id);
    if (!cert || cert.user_id.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }
    res.json({ success: true, certificate: cert });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyCertificates,
  getCertificateDetail,
};
