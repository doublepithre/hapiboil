const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Recommendation = sequelize.define('Recommendation', {
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
    score: {
      type: DataTypes.REAL,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'recommendation',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "idx_score",
        fields: [
          { name: "score" },
        ]
      },
      {
        name: "recommendation_pkey",
        unique: true,
        fields: [
          { name: "user_id" },
          { name: "job_id" },
        ]
      },
    ]
  });
  Recommendation.associate = function(model) {
    initRelations(model);
  }
  return Recommendation;
}
const initRelations = (model) =>{
  const Recommendation = model.Recommendation;
  const Job = model.Job;
  const Userinfo = model.Userinfo;


  Recommendation.belongsTo(Job, { as: "job", foreignKey: "jobId"});
  Recommendation.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});

}
