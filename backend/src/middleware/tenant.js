const { runWithTenant } = require('../utils/tenantContext');

function bindTenant(req, res, next) {
  const bypass = req.admin?.role === 'superadmin';
  if (!bypass && !req.admin?.workspaceId) {
    return res.status(403).json({ message: 'This account is not attached to a workspace.' });
  }
  return runWithTenant({ workspaceId: req.admin?.workspaceId?.toString(), bypass }, next);
}

module.exports = { bindTenant };
