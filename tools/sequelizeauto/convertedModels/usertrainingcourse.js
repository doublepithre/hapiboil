const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Usertrainingcourse = sequelize.define('Usertrainingcourse', {
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
    courseId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: {
          tableName: 'trainingcourse',
          schema: 'hris'
        },
        key: 'course_id'
      },
      field: 'course_id'
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "not started"
    }
  }, {
    sequelize,
    tableName: 'usertrainingcourse',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "usertrainingcourse_pkey",
        unique: true,
        fields: [
          { name: "user_id" },
          { name: "course_id" },
        ]
      },
    ]
  });
  Usertrainingcourse.associate = function(model) {
    initRelations(model);
  }
  return Usertrainingcourse;
}
const initRelations = (model) =>{
  const Usertrainingcourse = model.Usertrainingcourse;
  const Trainingcourse = model.Trainingcourse;
  const Userinfo = model.Userinfo;


  Usertrainingcourse.belongsTo(Trainingcourse, { as: "course", foreignKey: "courseId"});
  Usertrainingcourse.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});

}
