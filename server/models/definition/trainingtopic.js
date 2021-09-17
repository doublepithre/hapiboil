const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Trainingtopic = sequelize.define('Trainingtopic', {
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
  Trainingtopic.associate = function(model) {
    initRelations(model);
  }
  return Trainingtopic;
}
const initRelations = (model) =>{
  const Trainingtopic = model.Trainingtopic;
  const Trainingcourse = model.Trainingcourse;
  const Attributeset = model.Attributeset;
  const Trainingcoursetopic = model.Trainingcoursetopic;


  Trainingtopic.belongsToMany(Trainingcourse, { through: Trainingcoursetopic, foreignKey: "topicId", otherKey: "courseId" });
  Trainingtopic.belongsTo(Attributeset, { as: "attribute", foreignKey: "attributeId"});
  Trainingtopic.hasMany(Trainingcoursetopic, { as: "trainingcoursetopics", foreignKey: "topicId"});

}
