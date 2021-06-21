const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Report', {
    displayName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'display_name'
    },
    questionKey: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      field: 'question_key'
    },
    questionId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'questionnaire',
          schema: 'hris'
        },
        key: 'question_id'
      },
      field: 'question_id'
    }
  }, {
    sequelize,
    tableName: 'report',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "report_pkey",
        unique: true,
        fields: [
          { name: "question_key" },
        ]
      },
    ]
  });
};
