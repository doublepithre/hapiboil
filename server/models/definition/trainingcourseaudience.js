const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Trainingcourseaudience = sequelize.define('Trainingcourseaudience', {
    audience: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: {
          tableName: 'usertype',
          schema: 'hris'
        },
        key: 'user_type_id'
      }
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
    }
  }, {
    sequelize,
    tableName: 'trainingcourseaudience',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "trainingcourseaudience_pkey",
        unique: true,
        fields: [
          { name: "audience" },
          { name: "course_id" },
        ]
      },
    ]
  });
  Trainingcourseaudience.associate = function(model) {
    initRelations(model);
  }
  return Trainingcourseaudience;
}
const initRelations = (model) =>{
  const Trainingcourseaudience = model.Trainingcourseaudience;
  const Trainingcourse = model.Trainingcourse;
  const Usertype = model.Usertype;


  Trainingcourseaudience.belongsTo(Trainingcourse, { as: "course", foreignKey: "courseId"});
  Trainingcourseaudience.belongsTo(Usertype, { as: "audienceUsertype", foreignKey: "audience"});

}
