const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Resource = sequelize.define('Resource', {
    resourceId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'resource_id'
    },
    courseTitle: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'course_title'
    },
    topic: {
      type: DataTypes.STRING,
      allowNull: true
    },
    mode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    usertype: {
      type: DataTypes.ARRAY(DataTypes.BIGINT),
      allowNull: true
    },
    url: {
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
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: Sequelize.fn('now'),
      field: 'updated_at'
    },
    countryId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'country',
          schema: 'hris'
        },
        key: 'country_id'
      },
      field: 'country_id'
    }
  }, {
    sequelize,
    tableName: 'resources',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "resources_pkey",
        unique: true,
        fields: [
          { name: "resource_id" },
        ]
      },
    ]
  });
  Resource.associate = function(model) {
    initRelations(model);
  }
  return Resource;
}
const initRelations = (model) =>{
  const Resource = model.Resource;
  const Country = model.Country;


  Resource.belongsTo(Country, { as: "country", foreignKey: "countryId"});

}
