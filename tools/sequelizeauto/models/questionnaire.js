const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Questionnaire', {
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
    companyId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'company',
          schema: 'hris'
        },
        key: 'company_id'
      },
      field: 'company_id'
    },
    questionConfig: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'question_config'
    },
    answerConfig: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'answer_config'
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
};
