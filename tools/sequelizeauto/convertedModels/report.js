const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Report = sequelize.define('Report', {
    displayName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'display_name'
    },
    questionKey: {
      type: DataTypes.STRING,
      allowNull: true,
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
    timestamps: false
  });
  Report.associate = function(model) {
    initRelations(model);
  }
  return Report;
}
const initRelations = (model) =>{
  const Report = model.Report;
  const Questionnaire = model.Questionnaire;


  Report.belongsTo(Questionnaire, { as: "question", foreignKey: "questionId"});

}
