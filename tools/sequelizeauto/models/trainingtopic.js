const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Trainingtopic', {
    topicId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'topic_id'
    },
    attributeId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'attributeset',
          schema: 'hris'
        },
        key: 'attribute_id'
      },
      field: 'attribute_id'
    },
    topicName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'topic_name'
    }
  }, {
    sequelize,
    tableName: 'trainingtopic',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "trainingtopic_pkey",
        unique: true,
        fields: [
          { name: "topic_id" },
        ]
      },
    ]
  });
};
