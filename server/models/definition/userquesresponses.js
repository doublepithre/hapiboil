/* eslint new-cap: "off", global-require: "off" */

module.exports = (sequelize, DataTypes) => {
    const Userquesresponse = sequelize.define('Userquesresponse', {
        responseId: {
            type: DataTypes.BIGINT,
            field: 'response_id',
            allowNull: false,
            autoIncrement: true
        },
        questionId: {
            type: DataTypes.BIGINT,
            field: 'question_id',
            allowNull: false,
            primaryKey: true,
            references: {
                model: 'questionnaire',
                key: 'question_id'
            },
            onUpdate: 'NO ACTION',
            onDelete: 'NO ACTION'
        },
        responseVal: {
            type: DataTypes.JSONB,
            field: 'response_val',
            allowNull: false
        },
        userId: {
            type: DataTypes.BIGINT,
            field: 'user_id',
            allowNull: false,
            primaryKey: true,
            references: {
                model: 'userinfo',
                key: 'user_id'
            },
            onUpdate: 'NO ACTION',
            onDelete: 'NO ACTION'
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
        tableName: 'userquesresponses',
        timestamps: false
    });
    Userquesresponse.associate = function(model) {
        initRelations(model)
    }
    return Userquesresponse;
};

const initRelations = (model) => {
    const Userquesresponse = model.Userquesresponse;
    const Questionnaire = model.Questionnaire;
    const Userinfo = model.Userinfo;

    Userquesresponse.belongsTo(Questionnaire, {
        as: 'Question',
        foreignKey: 'question_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Userquesresponse.belongsTo(Userinfo, {
        as: 'User',
        foreignKey: 'user_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

};
