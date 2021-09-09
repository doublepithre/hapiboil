const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Trainingcoursetopic', {
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
    topicId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: {
          tableName: 'trainingtopic',
          schema: 'hris'
        },
        key: 'topic_id'
      },
      field: 'topic_id'
    }
  }, {
    sequelize,
    tableName: 'trainingcoursetopic',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "trainingcoursetopic_pkey",
        unique: true,
        fields: [
          { name: "course_id" },
          { name: "topic_id" },
        ]
      },
    ]
  });
};
