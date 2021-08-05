const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Onboarding = sequelize.define('Onboarding', {
    onboardingId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'onboarding_id'
    },
    onboardee: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'userinfo',
          schema: 'hris'
        },
        key: 'user_id'
      }
    },
    onboarder: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'userinfo',
          schema: 'hris'
        },
        key: 'user_id'
      }
    },
    status: {
      type: DataTypes.STRING,
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
    companyId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'company',
          schema: 'hris'
        },
        key: 'company_id'
      },
      field: 'company_id'
    },
    jobId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'jobs',
          schema: 'hris'
        },
        key: 'job_id'
      },
      field: 'job_id'
    }
  }, {
    sequelize,
    tableName: 'onboardings',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "onboardings_pkey",
        unique: true,
        fields: [
          { name: "onboarding_id" },
        ]
      },
    ]
  });
  Onboarding.associate = function(model) {
    initRelations(model);
  }
  return Onboarding;
}
const initRelations = (model) =>{
  const Onboarding = model.Onboarding;
  const Company = model.Company;
  const Job = model.Job;
  const Onboardingtask = model.Onboardingtask;
  const Userinfo = model.Userinfo;


  Onboarding.belongsTo(Company, { as: "company", foreignKey: "companyId"});
  Onboarding.belongsTo(Job, { as: "job", foreignKey: "jobId"});
  Onboarding.hasMany(Onboardingtask, { as: "onboardingtasks", foreignKey: "onboardingId"});
  Onboarding.belongsTo(Userinfo, { as: "onboardeeUserinfo", foreignKey: "onboardee"});
  Onboarding.belongsTo(Userinfo, { as: "onboarderUserinfo", foreignKey: "onboarder"});

}
