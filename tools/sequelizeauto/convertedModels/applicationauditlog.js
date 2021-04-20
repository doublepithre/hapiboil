const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Applicationauditlog = sequelize.define('Applicationauditlog', {
    applicationAuditLogId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'application_audit_log_id'
    },
    affectedApplicationId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'jobapplications',
          schema: 'hris'
        },
        key: 'application_id'
      },
      field: 'affected_application_id'
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
    tableName: 'applicationauditlog',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "applicationauditlog_pkey",
        unique: true,
        fields: [
          { name: "application_audit_log_id" },
        ]
      },
    ]
  });
  Applicationauditlog.associate = function(model) {
    initRelations(model);
  }
  return Applicationauditlog;
}
const initRelations = (model) =>{
  const Applicationauditlog = model.Applicationauditlog;
  const Jobapplication = model.Jobapplication;
  const Userinfo = model.Userinfo;


  Applicationauditlog.belongsTo(Jobapplication, { as: "affectedApplication", foreignKey: "affectedApplicationId"});
  Applicationauditlog.belongsTo(Userinfo, { as: "performerUser", foreignKey: "performerUserId"});

}
