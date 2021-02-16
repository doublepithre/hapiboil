const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Questionnaireanswer', {
    answerId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'answer_id'
    },
    questionId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'question_id'
    },
    questionUuid: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'question_uuid'
    },
    answerVal: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'answer_val'
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
    optionId: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      field: 'option_id'
    }
  }, {
    sequelize,
    tableName: 'questionnaireanswers',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "questionnaireanswers_pkey",
        unique: true,
        fields: [
          { name: "answer_id" },
        ]
      },
    ]
  });
};
