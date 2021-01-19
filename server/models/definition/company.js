/* eslint new-cap: "off", global-require: "off" */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Company', {
        companyId: {
            type: DataTypes.BIGINT,
            field: 'company_id',
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        companyUuid: {
            type: DataTypes.UUID,
            field: 'company_uuid',
            allowNull: false
        },
        companyName: {
            type: DataTypes.STRING(500),
            field: 'company_name',
            allowNull: false
        },
        displayName: {
            type: DataTypes.STRING(500),
            field: 'display_name',
            allowNull: true
        },
        website: {
            type: DataTypes.STRING(500),
            field: 'website',
            allowNull: true
        },
        description: {
            type: DataTypes.TEXT,
            field: 'description',
            allowNull: true
        },
        companyType: {
            type: DataTypes.INTEGER,
            field: 'company_type',
            allowNull: true
        },
        active: {
            type: DataTypes.BOOLEAN,
            field: 'active',
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
        tableName: 'company',
        timestamps: false
    });
};

module.exports.initRelations = () => {
    delete module.exports.initRelations; // Destroy itself to prevent repeated calls.

    const model = require('../index');
    const Company = model.Company;
    const Questionnaire = model.Questionnaire;
    const Userinfo = model.Userinfo;
    const Questioncategory = model.Questioncategory;
    const Questiontype = model.Questiontype;
    const User = model.User;
    const Usertype = model.Usertype;

    Company.hasMany(Questionnaire, {
        as: 'QuestionnaireCompanyIdFkeys',
        foreignKey: 'company_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Company.hasMany(Userinfo, {
        as: 'UserinfoCompanyIdFkeys',
        foreignKey: 'company_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Company.hasMany(Userinfo, {
        as: 'UserinfoCompanyUuidFkeys',
        foreignKey: 'company_uuid',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Company.belongsToMany(Userinfo, {
        as: 'QuestionnaireCreatedBies',
        through: Questionnaire,
        foreignKey: 'company_id',
        otherKey: 'created_by',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Company.belongsToMany(Questioncategory, {
        as: 'QuestionnaireQuestionCategories',
        through: Questionnaire,
        foreignKey: 'company_id',
        otherKey: 'question_category_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Company.belongsToMany(Questiontype, {
        as: 'QuestionnaireQuestionTypes',
        through: Questionnaire,
        foreignKey: 'company_id',
        otherKey: 'question_type_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Company.belongsToMany(Company, {
        as: 'UserinfoCompanyUus',
        through: Userinfo,
        foreignKey: 'company_id',
        otherKey: 'company_uuid',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Company.belongsToMany(User, {
        as: 'UserinfoUsers',
        through: Userinfo,
        foreignKey: 'company_id',
        otherKey: 'user_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Company.belongsToMany(Usertype, {
        as: 'UserinfoUserTypes',
        through: Userinfo,
        foreignKey: 'company_id',
        otherKey: 'user_type_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Company.belongsToMany(User, {
        as: 'UserinfoUserUus',
        through: Userinfo,
        foreignKey: 'company_id',
        otherKey: 'user_uuid',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Company.belongsToMany(Company, {
        as: 'UserinfoCompanies',
        through: Userinfo,
        foreignKey: 'company_uuid',
        otherKey: 'company_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Company.belongsToMany(User, {
        as: 'UserinfoUsers',
        through: Userinfo,
        foreignKey: 'company_uuid',
        otherKey: 'user_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Company.belongsToMany(Usertype, {
        as: 'UserinfoUserTypes',
        through: Userinfo,
        foreignKey: 'company_uuid',
        otherKey: 'user_type_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Company.belongsToMany(User, {
        as: 'UserinfoUserUus',
        through: Userinfo,
        foreignKey: 'company_uuid',
        otherKey: 'user_uuid',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

};
