const Certificate = require("../../model/certificate.model");
const CertificateTemplate = require("../../model/certificateTemplate.model");

async function findByUser(userId) {
  return Certificate.find({ user_id: userId })
    .populate("template_id")
    .populate("event_id")
    .sort({ issued_at: -1 });
}

async function findByIdForUser(certId, userId) {
  return Certificate.findOne({ _id: certId, user_id: userId })
    .populate("template_id")
    .populate("event_id");
}

module.exports = {
  findByUser,
  findByIdForUser,
};
