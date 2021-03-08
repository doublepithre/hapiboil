const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Userquesresponse = sequelize.define('Userquesresponse', {
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
      field: 'user_id'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'updated_at'
    }
  }, {
    sequelize,
    tableName: 'userquesresponses',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "userquesresponses_pkey",
        unique: true,
        fields: [
          { name: "question_id" },
          { name: "user_id" },
        ]
      },
    ]
  });
  Userquesresponse.associate = function(model) {
    initRelations(model);
  }
  return Userquesresponse;
}
const initRelations = (model) =>{
  const Userquesresponse = model.Userquesresponse;
  const Questionnaire = model.Questionnaire;


  Userquesresponse.belongsTo(Questionnaire, { as: "question", foreignKey: "questionId"});

}
