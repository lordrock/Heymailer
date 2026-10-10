const mongoose = require('mongoose');
const { currentTenant } = require('../../utils/tenantContext');

function tenantPlugin(schema) {
  schema.add({ workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', index: true } });

  const queryOperations = ['find', 'findOne', 'countDocuments', 'updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany'];
  queryOperations.forEach((operation) => {
    schema.pre(operation, function applyTenantToQuery() {
      const tenant = currentTenant();
      if (tenant?.workspaceId && !tenant.bypass) this.where({ workspaceId: tenant.workspaceId });
    });
  });

  schema.pre('aggregate', function applyTenantToAggregate() {
    const tenant = currentTenant();
    if (tenant?.workspaceId && !tenant.bypass) this.pipeline().unshift({ $match: { workspaceId: new mongoose.Types.ObjectId(tenant.workspaceId) } });
  });

  schema.pre('validate', function applyTenantToDocument(next) {
    const tenant = currentTenant();
    if (!this.workspaceId && tenant?.workspaceId && !tenant.bypass) this.workspaceId = tenant.workspaceId;
    next();
  });
}

module.exports = tenantPlugin;
