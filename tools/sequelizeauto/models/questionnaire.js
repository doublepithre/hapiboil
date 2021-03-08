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
    },
    weight: {
      type: DataTypes.REAL,
      allowNull: true,
      defaultValue: 1.0
    },
    isDemographic: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: 'is_demographic'
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
