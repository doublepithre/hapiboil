const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Trainingcourseaudience', {
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
};
