/* eslint new-cap: "off", global-require: "off" */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Userinfo', {
        userId: {
            type: DataTypes.BIGINT,
            field: 'user_id',
            allowNull: false,
            primaryKey: true,
            references: {
                model: 'user',
                key: 'user_id'
            },
            onUpdate: 'NO ACTION',
            onDelete: 'NO ACTION'
        },
        userUuid: {
            type: DataTypes.UUID,
            field: 'user_uuid',
            allowNull: false,
            references: {
                model: 'user',
                key: 'user_uuid'
            },
            onUpdate: 'NO ACTION',
            onDelete: 'NO ACTION'
        },
        email: {
            type: DataTypes.STRING,
            field: 'email',
            allowNull: false
        },
        roleId: {
            type: DataTypes.INTEGER,
            field: 'role_id',
            allowNull: false
        },
        userTypeId: {
            type: DataTypes.INTEGER,
            field: 'user_type_id',
            allowNull: false,
            references: {
                model: 'usertype',
                key: 'user_type_id'
            },
            onUpdate: 'NO ACTION',
            onDelete: 'NO ACTION'
        },
        active: {
            type: DataTypes.BOOLEAN,
            field: 'active',
            allowNull: false
        },
        companyId: {
            type: DataTypes.BIGINT,
            field: 'company_id',
            allowNull: true,
            references: {
                model: 'company',
                key: 'company_id'
            },
            onUpdate: 'NO ACTION',
            onDelete: 'NO ACTION'
        },
        companyUuid: {
            type: DataTypes.UUID,
            field: 'company_uuid',
            allowNull: true,
            references: {
                model: 'company',
                key: 'company_uuid'
            },
            onUpdate: 'NO ACTION',
            onDelete: 'NO ACTION'
        },
        firstName: {
            type: DataTypes.STRING,
            field: 'first_name',
            allowNull: false
        },
        lastName: {
            type: DataTypes.STRING,
            field: 'last_name',
            allowNull: true
        },
        picture: {
            type: DataTypes.STRING,
            field: 'picture',
            allowNull: true
        },
        isAdmin: {
            type: DataTypes.BOOLEAN,
            field: 'is_admin',
            allowNull: true
        },
        tzid: {
            type: DataTypes.STRING,
            field: 'tzid',
            allowNull: true
        },
        primaryMobile: {
            type: DataTypes.STRING,
            field: 'primary_mobile',
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
        tableName: 'userinfo',
        timestamps: false
    });
};

module.exports.initRelations = () => {
    delete module.exports.initRelations; // Destroy itself to prevent repeated calls.

    const model = require('../index');
    const Userinfo = model.Userinfo;
    const Questionnaire = model.Questionnaire;
    const Userquesresponse = model.Userquesresponse;
    const Company = model.Company;
    const User = model.User;
    const Usertype = model.Usertype;
    const Questioncategory = model.Questioncategory;
    const Questiontype = model.Questiontype;

    Userinfo.hasMany(Questionnaire, {
        as: 'QuestionnaireCreatedByFkeys',
        foreignKey: 'created_by',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Userinfo.hasMany(Userquesresponse, {
        as: 'UserquesresponsesUserIdFkeys',
        foreignKey: 'user_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Userinfo.belongsTo(Company, {
        as: 'Company',
        foreignKey: 'company_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Userinfo.belongsTo(Company, {
        as: 'CompanyUu',
        foreignKey: 'company_uuid',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Userinfo.belongsTo(User, {
        as: 'User',
        foreignKey: 'user_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Userinfo.belongsTo(Usertype, {
        as: 'UserType',
        foreignKey: 'user_type_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Userinfo.belongsTo(User, {
        as: 'UserUu',
        foreignKey: 'user_uuid',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Userinfo.belongsToMany(Company, {
        as: 'QuestionnaireCompanies',
        through: Questionnaire,
        foreignKey: 'created_by',
        otherKey: 'company_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Userinfo.belongsToMany(Questioncategory, {
        as: 'QuestionnaireQuestionCategories',
        through: Questionnaire,
        foreignKey: 'created_by',
        otherKey: 'question_category_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Userinfo.belongsToMany(Questiontype, {
        as: 'QuestionnaireQuestionTypes',
        through: Questionnaire,
        foreignKey: 'created_by',
        otherKey: 'question_type_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

};
