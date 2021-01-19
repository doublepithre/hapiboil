/* eslint new-cap: "off", global-require: "off" */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Questioncategory', {
        questionCategoryId: {
            type: DataTypes.BIGINT,
            field: 'question_category_id',
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        questionCategoryName: {
            type: DataTypes.STRING,
            field: 'question_category_name',
            allowNull: false
        },
        companyId: {
            type: DataTypes.BIGINT,
            field: 'company_id',
            allowNull: true
        },
        createdAt: {
            type: DataTypes.DATE,
            field: 'created_at',
            allowNull: true
        },
        updatedAt: {
            type: DataTypes.DATE,
            field: 'updated_at',
            allowNull: true
        }
    }, {
        schema: 'hris',
        tableName: 'questioncategory',
        timestamps: false
    });
};

module.exports.initRelations = () => {
    delete module.exports.initRelations; // Destroy itself to prevent repeated calls.

    const model = require('../index');
    const Questioncategory = model.Questioncategory;
    const Questionnaire = model.Questionnaire;
    const Company = model.Company;
    const Userinfo = model.Userinfo;
    const Questiontype = model.Questiontype;

    Questioncategory.hasMany(Questionnaire, {
        as: 'QuestionnaireQuestionCategoryIdFkeys',
        foreignKey: 'question_category_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Questioncategory.belongsToMany(Company, {
        as: 'QuestionnaireCompanies',
        through: Questionnaire,
        foreignKey: 'question_category_id',
        otherKey: 'company_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Questioncategory.belongsToMany(Userinfo, {
        as: 'QuestionnaireCreatedBies',
        through: Questionnaire,
        foreignKey: 'question_category_id',
        otherKey: 'created_by',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Questioncategory.belongsToMany(Questiontype, {
        as: 'QuestionnaireQuestionTypes',
        through: Questionnaire,
        foreignKey: 'question_category_id',
        otherKey: 'question_type_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

};
