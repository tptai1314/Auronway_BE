const repo = require("./certificates.repo");

function throwError(msg, status = 400) {
  const err = new Error(msg);
  err.status = status;
  throw err;
}

// Lấy tất cả chứng chỉ của user
async function getMyCertificates(userId) {
  return repo.findByUser(userId);
}

// Lấy chi tiết 1 chứng chỉ
async function getCertificateDetail(certId, userId) {
  const cert = await repo.findByIdForUser(certId, userId);
  if (!cert) throwError("Certificate not found", 404);
  return cert;
}

module.exports = {
  getMyCertificates,
  getCertificateDetail,
};
