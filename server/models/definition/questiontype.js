/* eslint new-cap: "off", global-require: "off" */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Questiontype', {
        questionTypeId: {
            type: DataTypes.BIGINT,
            field: 'question_type_id',
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        questionTypeName: {
            type: DataTypes.STRING,
            field: 'question_type_name',
            allowNull: false
        },
        displayName: {
            type: DataTypes.STRING,
            field: 'display_name',
            allowNull: true
        }
    }, {
        schema: 'hris',
        tableName: 'questiontype',
        timestamps: false
    });
};

module.exports.initRelations = () => {
    delete module.exports.initRelations; // Destroy itself to prevent repeated calls.

    const model = require('../index');
    const Questiontype = model.Questiontype;
    const Questionnaire = model.Questionnaire;
    const Company = model.Company;
    const Userinfo = model.Userinfo;
    const Questioncategory = model.Questioncategory;

    Questiontype.hasMany(Questionnaire, {
        as: 'QuestionnaireQuestionTypeIdFkeys',
        foreignKey: 'question_type_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Questiontype.belongsToMany(Company, {
        as: 'QuestionnaireCompanies',
        through: Questionnaire,
        foreignKey: 'question_type_id',
        otherKey: 'company_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Questiontype.belongsToMany(Userinfo, {
        as: 'QuestionnaireCreatedBies',
        through: Questionnaire,
        foreignKey: 'question_type_id',
        otherKey: 'created_by',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Questiontype.belongsToMany(Questioncategory, {
        as: 'QuestionnaireQuestionCategories',
        through: Questionnaire,
        foreignKey: 'question_type_id',
        otherKey: 'question_category_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

};
