const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Jobsquesresponse = sequelize.define('Jobsquesresponse', {
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
    jobId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'job_id'
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
    tableName: 'jobsquesresponses',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "jobsquesresponses_pkey",
        unique: true,
        fields: [
          { name: "question_id" },
          { name: "job_id" },
        ]
      },
    ]
  });
  Jobsquesresponse.associate = function(model) {
    initRelations(model);
  }
  return Jobsquesresponse;
}
const initRelations = (model) =>{
  const Jobsquesresponse = model.Jobsquesresponse;
  const Job = model.Job;
  const Questionnaire = model.Questionnaire;


  Jobsquesresponse.belongsTo(Job, { as: "job", foreignKey: "jobId"});
  Jobsquesresponse.belongsTo(Questionnaire, { as: "question", foreignKey: "questionId"});

}
