const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Questioncategory = sequelize.define('Questioncategory', {
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
      field: 'question_category_name'
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
    ]
  });
  Questioncategory.associate = function(model) {
    initRelations(model);
  }
  return Questioncategory;
}
const initRelations = (model) =>{
  const Questioncategory = model.Questioncategory;
  const Questionnaire = model.Questionnaire;


  Questioncategory.hasMany(Questionnaire, { as: "questionnaires", foreignKey: "questionCategoryId"});

}
