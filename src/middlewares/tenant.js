const { prisma } = require('../shared/db');

async function tenantGuard(req, res, next) {
  try {
    const id = req.headers['x-tenant-id'];
    const code = req.headers['x-tenant-code'];

    let tenant = null;
    if (id) {
      tenant = await prisma.tenant.findFirst({ where: { id, status: 'ACTIVE' } });
    } else if (code) {
      tenant = await prisma.tenant.findFirst({
        where: { code: { equals: code, mode: 'insensitive' }, status: 'ACTIVE' }
      });
    }

    if (!tenant) return res.status(400).json({ msg: 'Invalid or inactive tenant' });
    req.tenantId = tenant.id;
    next();
  } catch (e) {
    next(e);
  }
}

module.exports = { tenantGuard };
