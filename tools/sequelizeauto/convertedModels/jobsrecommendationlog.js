const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Jobsrecommendationlog = sequelize.define('Jobsrecommendationlog', {
    jobId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: {
          tableName: 'jobs',
          schema: 'hris'
        },
        key: 'job_id'
      },
      field: 'job_id'
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'jobsrecommendationlog',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "jobsrecommendationlog_pkey",
        unique: true,
        fields: [
          { name: "job_id" },
        ]
      },
    ]
  });
  Jobsrecommendationlog.associate = function(model) {
    initRelations(model);
  }
  return Jobsrecommendationlog;
}
const initRelations = (model) =>{
  const Jobsrecommendationlog = model.Jobsrecommendationlog;
  const Job = model.Job;


  Jobsrecommendationlog.belongsTo(Job, { as: "job", foreignKey: "jobId"});

}
