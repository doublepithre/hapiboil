const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Profileauditlog = sequelize.define('Profileauditlog', {
    profileAuditLogId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'profile_audit_log_id'
    },
    affectedUserId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'userinfo',
          schema: 'hris'
        },
        key: 'user_id'
      },
      field: 'affected_user_id'
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
    tableName: 'profileauditlog',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "profileauditlog_pkey",
        unique: true,
        fields: [
          { name: "profile_audit_log_id" },
        ]
      },
    ]
  });
  Profileauditlog.associate = function(model) {
    initRelations(model);
  }
  return Profileauditlog;
}
const initRelations = (model) =>{
  const Profileauditlog = model.Profileauditlog;
  const Userinfo = model.Userinfo;


  Profileauditlog.belongsTo(Userinfo, { as: "affectedUser", foreignKey: "affectedUserId"});
  Profileauditlog.belongsTo(Userinfo, { as: "performerUser", foreignKey: "performerUserId"});

}
