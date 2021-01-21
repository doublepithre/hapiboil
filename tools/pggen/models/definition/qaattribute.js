/* eslint new-cap: "off", global-require: "off" */

module.exports = (sequelize, DataTypes) => {
    const Qaattribute = sequelize.define('Qaattribute', {
        qaaId: {
            type: DataTypes.BIGINT,
            field: 'qaa_id',
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        answerId: {
            type: DataTypes.BIGINT,
            field: 'answer_id',
            allowNull: false,
            references: {
                model: 'questionnaireanswers',
                key: 'answer_id'
            },
            onUpdate: 'NO ACTION',
            onDelete: 'NO ACTION'
        },
        attributeId: {
            type: DataTypes.BIGINT,
            field: 'attribute_id',
            allowNull: true,
            references: {
                model: 'attributeset',
                key: 'attribute_id'
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
        },
        attributeValue: {
            type: DataTypes.FLOAT(53),
            field: 'attribute_value',
            allowNull: true
        }
    }, {
        schema: 'hris',
        tableName: 'qaattribute',
        timestamps: false
    });
    Qaattribute.associate = function(model) {
        initRelations(model)
    }
    return Qaattribute;
};

const initRelations = (model) => {
    const Qaattribute = model.Qaattribute;
    const Questionnaireanswer = model.Questionnaireanswer;
    const Attributeset = model.Attributeset;

    Qaattribute.belongsTo(Questionnaireanswer, {
        as: 'Answer',
        foreignKey: 'answer_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Qaattribute.belongsTo(Attributeset, {
        as: 'Attribute',
        foreignKey: 'attribute_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

};
