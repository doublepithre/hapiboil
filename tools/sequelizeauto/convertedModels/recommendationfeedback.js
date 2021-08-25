const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Recommendationfeedback = sequelize.define('Recommendationfeedback', {
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
    userFeedback: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: 'user_feedback'
    },
    jobFeedback: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: 'job_feedback'
    }
  }, {
    sequelize,
    tableName: 'recommendationfeedback',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "recommendationfeedback_pkey",
        unique: true,
        fields: [
          { name: "user_id" },
          { name: "job_id" },
        ]
      },
    ]
  });
  Recommendationfeedback.associate = function(model) {
    initRelations(model);
  }
  return Recommendationfeedback;
}
const initRelations = (model) =>{
  const Recommendationfeedback = model.Recommendationfeedback;
  const Job = model.Job;
  const Userinfo = model.Userinfo;


  Recommendationfeedback.belongsTo(Job, { as: "job", foreignKey: "jobId"});
  Recommendationfeedback.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});

}
