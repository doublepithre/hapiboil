const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('AutismCategory', {
    autismCatId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'autism_cat_id'
    },
    categoryName: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'category_name'
    }
  }, {
    sequelize,
    tableName: 'autism_categories',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "autism_categories_pkey",
        unique: true,
        fields: [
          { name: "autism_cat_id" },
        ]
      },
    ]
  });
};
