/* eslint new-cap: "off", global-require: "off" */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Questionnaireanswer', {
        answerId: {
            type: DataTypes.BIGINT,
            field: 'answer_id',
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        questionId: {
            type: DataTypes.BIGINT,
            field: 'question_id',
            allowNull: false
        },
        questionUuid: {
            type: DataTypes.UUID,
            field: 'question_uuid',
            allowNull: false
        },
        answerVal: {
            type: DataTypes.TEXT,
            field: 'answer_val',
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
        },
        optionId: {
            type: DataTypes.INTEGER,
            field: 'option_id',
            allowNull: true
        }
    }, {
        schema: 'hris',
        tableName: 'questionnaireanswers',
        timestamps: false
    });
};

module.exports.initRelations = () => {
    delete module.exports.initRelations; // Destroy itself to prevent repeated calls.

    const model = require('../index');
    const Questionnaireanswer = model.Questionnaireanswer;
    const Qaattribute = model.Qaattribute;
    const Attributeset = model.Attributeset;

    Questionnaireanswer.hasMany(Qaattribute, {
        as: 'QaatributeAnswerIdFkeys',
        foreignKey: 'answer_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Questionnaireanswer.belongsToMany(Attributeset, {
        as: 'QaattributeAttributes',
        through: Qaattribute,
        foreignKey: 'answer_id',
        otherKey: 'attribute_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

};
