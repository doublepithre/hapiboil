const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Usertype', {
    userTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'user_type_id'
    },
    userTypeName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'user_type_name'
    }
  }, {
    sequelize,
    tableName: 'usertype',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "usertype_pkey",
        unique: true,
        fields: [
          { name: "user_type_id" },
        ]
      },
    ]
  });
};
