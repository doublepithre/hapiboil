const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Companyquesresponse = sequelize.define('Companyquesresponse', {
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
    tableName: 'companyquesresponses',
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
  Companyquesresponse.associate = function(model) {
    initRelations(model);
  }
  return Companyquesresponse;
}
const initRelations = (model) =>{
  const Companyquesresponse = model.Companyquesresponse;
  const Company = model.Company;
  const Questionnaire = model.Questionnaire;
  const Userinfo = model.Userinfo;


  Companyquesresponse.belongsTo(Company, { as: "company", foreignKey: "companyId"});
  Companyquesresponse.belongsTo(Questionnaire, { as: "question", foreignKey: "questionId"});
  Companyquesresponse.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});

}
