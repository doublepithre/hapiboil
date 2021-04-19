const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Companyauditlog = sequelize.define('Companyauditlog', {
    companyAuditLogId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'company_audit_log_id'
    },
    affectedCompanyId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'company',
          schema: 'hris'
        },
        key: 'company_id'
      },
      field: 'affected_company_id'
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
    tableName: 'companyauditlog',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "companyauditlog_pkey",
        unique: true,
        fields: [
          { name: "company_audit_log_id" },
        ]
      },
    ]
  });
  Companyauditlog.associate = function(model) {
    initRelations(model);
  }
  return Companyauditlog;
}
const initRelations = (model) =>{
  const Companyauditlog = model.Companyauditlog;
  const Company = model.Company;
  const Userinfo = model.Userinfo;


  Companyauditlog.belongsTo(Company, { as: "affectedCompany", foreignKey: "affectedCompanyId"});
  Companyauditlog.belongsTo(Userinfo, { as: "performerUser", foreignKey: "performerUserId"});

}
