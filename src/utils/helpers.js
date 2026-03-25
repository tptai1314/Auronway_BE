// src/utils/helpers.js
// Add your helper functions here

function generateOTP(length = 6) {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
}

module.exports = {
  // Example helper
  greet: (name) => `Hello, ${name}!`,
  generateOTP
};
