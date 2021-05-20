const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Report = sequelize.define('Report', {
    questionKey: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      field: 'question_key'
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'display_name'
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
