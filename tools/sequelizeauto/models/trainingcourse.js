const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Trainingcourse', {
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
};
