const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Company = sequelize.define('Company', {
    companyId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'company_id'
    },
    companyUuid: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: "company_company_uuid_key",
      field: 'company_uuid'
    },
    companyName: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'company_name'
    },
    displayName: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'display_name'
    },
    website: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    companyType: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'company_type'
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: true
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
    tableName: 'company',
    schema: 'hris',
    hasTrigger: true,
    timestamps: false,
    indexes: [
      {
        name: "company_company_uuid_key",
        unique: true,
        fields: [
          { name: "company_uuid" },
        ]
      },
      {
        name: "company_pkey",
        unique: true,
        fields: [
          { name: "company_id" },
        ]
      },
    ]
  });
  Company.associate = function(model) {
    initRelations(model);
  }
  return Company;
}
const initRelations = (model) =>{
  const Company = model.Company;
  const Companyinfo = model.Companyinfo;
  const Questionnaire = model.Questionnaire;
  const Userinfo = model.Userinfo;


  Company.hasOne(Companyinfo, { as: "companyinfo", foreignKey: "companyId"});
  Company.hasMany(Questionnaire, { as: "questionnaires", foreignKey: "companyId"});
  Company.hasMany(Userinfo, { as: "userinfos", foreignKey: "companyId"});
  Company.hasMany(Userinfo, { as: "companyUuUserinfos", foreignKey: "companyUuid"});

}
