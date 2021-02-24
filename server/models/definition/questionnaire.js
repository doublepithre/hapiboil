const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Questionnaire = sequelize.define('Questionnaire', {
    questionId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'question_id'
    },
    questionUuid: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: "questionnaire_question_uuid_key",
      field: 'question_uuid'
    },
    questionName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'question_name'
    },
    questionTypeId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'questiontype',
          schema: 'hris'
        },
        key: 'question_type_id'
      },
      field: 'question_type_id'
    },
    questionCategoryId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'questioncategory',
          schema: 'hris'
        },
        key: 'question_category_id'
      },
      field: 'question_category_id'
    },
    createdBy: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'userinfo',
          schema: 'hris'
        },
        key: 'user_id'
      },
      field: 'created_by'
    },
    questionConfig: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'question_config'
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
    questionTargetId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'questiontarget',
          schema: 'hris'
        },
        key: 'target_id'
      },
      field: 'question_target_id'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
      field: 'is_active'
    },
    isCaseStudy: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: 'is_case_study'
    }
  }, {
    sequelize,
    tableName: 'questionnaire',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "questionnaire_pkey",
        unique: true,
        fields: [
          { name: "question_id" },
        ]
      },
      {
        name: "questionnaire_question_uuid_key",
        unique: true,
        fields: [
          { name: "question_uuid" },
        ]
      },
    ]
  });
  Questionnaire.associate = function(model) {
    initRelations(model);
  }
  return Questionnaire;
}
const initRelations = (model) =>{
  const Questionnaire = model.Questionnaire;
  const Userinfo = model.Userinfo;
  const Questioncategory = model.Questioncategory;
  const Questionmapping = model.Questionmapping;
  const Questionnaireanswer = model.Questionnaireanswer;
  const Userquesresponse = model.Userquesresponse;
  const Questiontarget = model.Questiontarget;
  const Questiontype = model.Questiontype;


  Questionnaire.belongsToMany(Questionnaire, { through: Questionmapping, foreignKey: "empauwerAllQid", otherKey: "empauwerMeQid", as:"ea2em" });
  Questionnaire.belongsToMany(Questionnaire, { through: Questionmapping, foreignKey: "empauwerMeQid", otherKey: "empauwerAllQid", as:"em2ea" });
  Questionnaire.belongsToMany(Userinfo, { through: Userquesresponse, foreignKey: "questionId", otherKey: "userId" });
  Questionnaire.belongsTo(Questioncategory, { as: "questionCategory", foreignKey: "questionCategoryId"});
  Questionnaire.hasMany(Questionmapping, { as: "questionmappings", foreignKey: "empauwerAllQid"});
  Questionnaire.hasMany(Questionmapping, { as: "empauwerMeQQuestionmappings", foreignKey: "empauwerMeQid"});
  Questionnaire.hasMany(Questionnaireanswer, { as: "questionnaireanswers", foreignKey: "questionId"});
  Questionnaire.hasMany(Userquesresponse, { as: "userquesresponses", foreignKey: "questionId"});
  Questionnaire.belongsTo(Questiontarget, { as: "questionTarget", foreignKey: "questionTargetId"});
  Questionnaire.belongsTo(Questiontype, { as: "questionType", foreignKey: "questionTypeId"});
  Questionnaire.belongsTo(Userinfo, { as: "createdByUserinfo", foreignKey: "createdBy"});

}
