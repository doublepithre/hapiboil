const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Questionnaireanswer = sequelize.define('Questionnaireanswer', {
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
      references: {
        model: {
          tableName: 'questionnaire',
          schema: 'hris'
        },
        key: 'question_id'
      },
      field: 'question_id'
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
  Questionnaireanswer.associate = function(model) {
    initRelations(model);
  }
  return Questionnaireanswer;
}
const initRelations = (model) =>{
  const Questionnaireanswer = model.Questionnaireanswer;
  const Questionnaire = model.Questionnaire;
  const Qaattribute = model.Qaattribute;


  Questionnaireanswer.belongsTo(Questionnaire, { as: "question", foreignKey: "questionId"});
  Questionnaireanswer.hasMany(Qaattribute, { as: "qaattributes", foreignKey: "answerId"});

}
