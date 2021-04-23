const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Jobauditlog = sequelize.define('Jobauditlog', {
    jobAuditLogId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'job_audit_log_id'
    },
    affectedJobId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'jobs',
          schema: 'hris'
        },
        key: 'job_id'
      },
      field: 'affected_job_id'
    },
    performerUserId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'userinfo',
          schema: 'hris'
        },
        key: 'user_id'
      },
      field: 'performer_user_id'
    },
    actionName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'action_name'
    },
    actionType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'action_type'
    },
    actionDescription: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'action_description'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.fn('now'),
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.fn('now'),
      field: 'updated_at'
    }
  }, {
    sequelize,
    tableName: 'jobauditlog',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "jobauditlog_pkey",
        unique: true,
        fields: [
          { name: "job_audit_log_id" },
        ]
      },
    ]
  });
  Jobauditlog.associate = function(model) {
    initRelations(model);
  }
  return Jobauditlog;
}
const initRelations = (model) =>{
  const Jobauditlog = model.Jobauditlog;
  const Job = model.Job;
  const Userinfo = model.Userinfo;


  Jobauditlog.belongsTo(Job, { as: "affectedJob", foreignKey: "affectedJobId"});
  Jobauditlog.belongsTo(Userinfo, { as: "performerUser", foreignKey: "performerUserId"});

}
