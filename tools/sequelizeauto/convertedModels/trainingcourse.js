const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Trainingcourse = sequelize.define('Trainingcourse', {
    courseId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'course_id'
    },
    courseTitle: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'course_title'
    },
    modeId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'trainingmode',
          schema: 'hris'
        },
        key: 'mode_id'
      },
      field: 'mode_id'
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'trainingcourse',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "trainingcourse_pkey",
        unique: true,
        fields: [
          { name: "course_id" },
        ]
      },
    ]
  });
  Trainingcourse.associate = function(model) {
    initRelations(model);
  }
  return Trainingcourse;
}
const initRelations = (model) =>{
  const Trainingcourse = model.Trainingcourse;
  const Trainingtopic = model.Trainingtopic;
  const Userinfo = model.Userinfo;
  const Usertype = model.Usertype;
  const Trainingcourseaudience = model.Trainingcourseaudience;
  const Trainingcoursetopic = model.Trainingcoursetopic;
  const Usertrainingcourse = model.Usertrainingcourse;
  const Trainingmode = model.Trainingmode;


  Trainingcourse.belongsToMany(Trainingtopic, { through: Trainingcoursetopic, foreignKey: "courseId", otherKey: "topicId" });
  Trainingcourse.belongsToMany(Userinfo, { through: Usertrainingcourse, foreignKey: "courseId", otherKey: "userId" });
  Trainingcourse.belongsToMany(Usertype, { through: Trainingcourseaudience, foreignKey: "courseId", otherKey: "audience" });
  Trainingcourse.hasMany(Trainingcourseaudience, { as: "trainingcourseaudiences", foreignKey: "courseId"});
  Trainingcourse.hasMany(Trainingcoursetopic, { as: "trainingcoursetopics", foreignKey: "courseId"});
  Trainingcourse.hasMany(Usertrainingcourse, { as: "usertrainingcourses", foreignKey: "courseId"});
  Trainingcourse.belongsTo(Trainingmode, { as: "mode", foreignKey: "modeId"});

}
