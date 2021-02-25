const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Jobapplication = sequelize.define('Jobapplication', {
    applicationId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'application_id'
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
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'user_id'
    },
    isApplied: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'is_applied'
    },
    isWithdrawn: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'is_withdrawn'
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true
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
    }
  }, {
    sequelize,
    tableName: 'jobapplications',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "jobapplications_pkey",
        unique: true,
        fields: [
          { name: "job_id" },
          { name: "user_id" },
        ]
      },
    ]
  });
  Jobapplication.associate = function(model) {
    initRelations(model);
  }
  return Jobapplication;
}
const initRelations = (model) =>{
  const Jobapplication = model.Jobapplication;
  const Job = model.Job;
  const Userinfo = model.Userinfo;


  Jobapplication.belongsTo(Job, { as: "job", foreignKey: "jobId"});
  Jobapplication.belongsTo(Userinfo, { as: "applicant", foreignKey: "userId"});

}
