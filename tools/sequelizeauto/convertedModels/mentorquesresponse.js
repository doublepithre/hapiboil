const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Mentorquesresponse = sequelize.define('Mentorquesresponse', {
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
    }
  }, {
    sequelize,
    tableName: 'mentorquesresponses',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "mentorquesresponses_pkey",
        unique: true,
        fields: [
          { name: "question_id" },
          { name: "user_id" },
        ]
      },
    ]
  });
  Mentorquesresponse.associate = function(model) {
    initRelations(model);
  }
  return Mentorquesresponse;
}
const initRelations = (model) =>{
  const Mentorquesresponse = model.Mentorquesresponse;
  const Questionnaire = model.Questionnaire;
  const Userinfo = model.Userinfo;


  Mentorquesresponse.belongsTo(Questionnaire, { as: "question", foreignKey: "questionId"});
  Mentorquesresponse.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});

}
