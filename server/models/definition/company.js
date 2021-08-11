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
    },
    companyIndustryId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'companyindustry',
          schema: 'hris'
        },
        key: 'company_industry_id'
      },
      field: 'company_industry_id'
    },
    noOfEmployees: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'no_of_employees'
    },
    foundedYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'founded_year'
    },
    countryId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'country',
          schema: 'hris'
        },
        key: 'country_id'
      },
      field: 'country_id'
    },
    isCompanyOnboardingComplete: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: 'is_company_onboarding_complete'
    },
    supervisorRandR: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'supervisor_RandR'
    },
    workbuddyRandR: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'workbuddy_RandR'
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
  const Companyauditlog = model.Companyauditlog;
  const Companyinfo = model.Companyinfo;
  const Companyvisit = model.Companyvisit;
  const Companyworkaccommodation = model.Companyworkaccommodation;
  const Onboarding = model.Onboarding;
  const Userinfo = model.Userinfo;
  const Companyindustry = model.Companyindustry;
  const Country = model.Country;


  Company.hasMany(Companyauditlog, { as: "companyauditlogs", foreignKey: "affectedCompanyId"});
  Company.hasOne(Companyinfo, { as: "companyinfo", foreignKey: "companyId"});
  Company.hasMany(Companyvisit, { as: "companyvisits", foreignKey: "companyId"});
  Company.hasMany(Companyworkaccommodation, { as: "companyworkaccommodations", foreignKey: "companyId"});
  Company.hasMany(Onboarding, { as: "onboardings", foreignKey: "companyId"});
  Company.hasMany(Userinfo, { as: "userinfos", foreignKey: "companyId"});
  Company.hasMany(Userinfo, { as: "companyUuUserinfos", foreignKey: "companyUuid"});
  Company.belongsTo(Companyindustry, { as: "companyIndustry", foreignKey: "companyIndustryId"});
  Company.belongsTo(Country, { as: "country", foreignKey: "countryId"});

}
