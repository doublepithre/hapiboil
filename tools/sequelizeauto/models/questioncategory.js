const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Questioncategory', {
    questionCategoryId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'question_category_id'
    },
    questionCategoryName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: "questioncategory_question_category_name_company_id_key",
      field: 'question_category_name'
    },
    companyId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      unique: "questioncategory_question_category_name_company_id_key",
      field: 'company_id'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.fn('now'),
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.fn('now'),
      field: 'updated_at'
    }
  }, {
    sequelize,
    tableName: 'questioncategory',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "questioncategory_pkey",
        unique: true,
        fields: [
          { name: "question_category_id" },
        ]
      },
      {
        name: "questioncategory_question_category_name_company_id_key",
        unique: true,
        fields: [
          { name: "question_category_name" },
          { name: "company_id" },
        ]
      },
    ]
  });
};
