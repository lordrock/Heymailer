const { runWithTenant } = require('../utils/tenantContext');
const Workspace = require('../models/Workspace');

async function bindTenant(req, res, next) {
  try {
    const bypass = req.admin?.role === 'superadmin';
    if (!bypass && !req.admin?.workspaceId) {
      return res.status(403).json({ message: 'This account is not attached to a workspace.' });
    }
    if (!bypass) {
      const workspace = await Workspace.findById(req.admin.workspaceId).select('status').lean();
      if (!workspace) return res.status(403).json({ message: 'This account is not attached to a workspace.' });
      if (workspace.status !== 'active') {
        return res.status(403).json({ message: 'This workspace is suspended. Contact HeyMailer support.' });
      }
    }
    return runWithTenant({ workspaceId: req.admin?.workspaceId?.toString(), bypass }, next);
  } catch (error) {
    return next(error);
  }
}

module.exports = { bindTenant };
