/* eslint new-cap: "off", global-require: "off" */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Questionnaire', {
        questionId: {
            type: DataTypes.BIGINT,
            field: 'question_id',
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        questionUuid: {
            type: DataTypes.UUID,
            field: 'question_uuid',
            allowNull: false
        },
        questionName: {
            type: DataTypes.STRING,
            field: 'question_name',
            allowNull: false
        },
        questionTypeId: {
            type: DataTypes.BIGINT,
            field: 'question_type_id',
            allowNull: false,
            references: {
                model: 'questiontype',
                key: 'question_type_id'
            },
            onUpdate: 'NO ACTION',
            onDelete: 'NO ACTION'
        },
        questionCategoryId: {
            type: DataTypes.BIGINT,
            field: 'question_category_id',
            allowNull: true,
            references: {
                model: 'questioncategory',
                key: 'question_category_id'
            },
            onUpdate: 'NO ACTION',
            onDelete: 'NO ACTION'
        },
        createdBy: {
            type: DataTypes.BIGINT,
            field: 'created_by',
            allowNull: false,
            references: {
                model: 'userinfo',
                key: 'user_id'
            },
            onUpdate: 'NO ACTION',
            onDelete: 'NO ACTION'
        },
        companyId: {
            type: DataTypes.BIGINT,
            field: 'company_id',
            allowNull: false,
            references: {
                model: 'company',
                key: 'company_id'
            },
            onUpdate: 'NO ACTION',
            onDelete: 'NO ACTION'
        },
        questionConfig: {
            type: DataTypes.JSONB,
            field: 'question_config',
            allowNull: true
        },
        answerConfig: {
            type: DataTypes.JSON,
            field: 'answer_config',
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
        tableName: 'questionnaire',
        timestamps: false
    });
};

module.exports.initRelations = () => {
    delete module.exports.initRelations; // Destroy itself to prevent repeated calls.

    const model = require('../index');
    const Questionnaire = model.Questionnaire;
    const Questionmapping = model.Questionmapping;
    const Company = model.Company;
    const Userinfo = model.Userinfo;
    const Questioncategory = model.Questioncategory;
    const Questiontype = model.Questiontype;

    Questionnaire.hasMany(Questionmapping, {
        as: 'EmpauwerAllFkeys',
        foreignKey: 'empauwer_all_qid',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Questionnaire.hasMany(Questionmapping, {
        as: 'EmpauwerMeFkeys',
        foreignKey: 'empauwer_me_qid',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Questionnaire.belongsTo(Company, {
        as: 'Company',
        foreignKey: 'company_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Questionnaire.belongsTo(Userinfo, {
        as: 'RelatedCreatedBy',
        foreignKey: 'created_by',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Questionnaire.belongsTo(Questioncategory, {
        as: 'QuestionCategory',
        foreignKey: 'question_category_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Questionnaire.belongsTo(Questiontype, {
        as: 'QuestionType',
        foreignKey: 'question_type_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Questionnaire.belongsToMany(Questionnaire, {
        as: 'QuestionmappingEmpauwerMeQs',
        through: Questionmapping,
        foreignKey: 'empauwer_all_qid',
        otherKey: 'empauwer_me_qid',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Questionnaire.belongsToMany(Questionnaire, {
        as: 'QuestionmappingEmpauwerAllQs',
        through: Questionmapping,
        foreignKey: 'empauwer_me_qid',
        otherKey: 'empauwer_all_qid',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

};
