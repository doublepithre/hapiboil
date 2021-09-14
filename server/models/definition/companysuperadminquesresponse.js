const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Companysuperadminquesresponse = sequelize.define('Companysuperadminquesresponse', {
    responseId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'response_id'
    },
    questionId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: {
          tableName: 'questionnaire',
          schema: 'hris'
        },
        key: 'question_id'
      },
      field: 'question_id'
    },
    responseVal: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'response_val'
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: {
          tableName: 'userinfo',
          schema: 'hris'
        },
        key: 'user_id'
      },
      field: 'user_id'
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
    timeTaken: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'time_taken'
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
    }
  }, {
    sequelize,
    tableName: 'companysuperadminquesresponses',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "companysuperadminquesresponses_pkey",
        unique: true,
        fields: [
          { name: "question_id" },
          { name: "user_id" },
        ]
      },
    ]
  });
  Companysuperadminquesresponse.associate = function(model) {
    initRelations(model);
  }
  return Companysuperadminquesresponse;
}
const initRelations = (model) =>{
  const Companysuperadminquesresponse = model.Companysuperadminquesresponse;
  const Company = model.Company;
  const Questionnaire = model.Questionnaire;
  const Userinfo = model.Userinfo;


  Companysuperadminquesresponse.belongsTo(Company, { as: "company", foreignKey: "companyId"});
  Companysuperadminquesresponse.belongsTo(Questionnaire, { as: "question", foreignKey: "questionId"});
  Companysuperadminquesresponse.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});

}
