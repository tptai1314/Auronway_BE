const express = require('express');
const router = express.Router();
const Tenant = require('../../model/tenant.model');
const User = require('../../model/user.model');
const { authenticate } = require('../../middlewares/auth');

// GET /tenants/me - Xem user thuộc tenant nào
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('affiliations.tenant_id');
    if (!user || !user.affiliations || user.affiliations.length === 0) {
      return res.json({
        success: true,
        tenant: null,
        message: 'Bạn là PUBLIC USER, chưa thuộc tenant nào.'
      });
    }
    // Lấy tenant đầu tiên (hoặc tất cả nếu muốn)
    const tenant = user.affiliations[0].tenant_id;
    res.json({
      success: true,
      tenant
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
