/* eslint new-cap: "off", global-require: "off" */

module.exports = (sequelize, DataTypes) => {
    const Attributeset = sequelize.define('Attributeset', {
        attributeId: {
            type: DataTypes.BIGINT,
            field: 'attribute_id',
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        attributeName: {
            type: DataTypes.STRING,
            field: 'attribute_name',
            allowNull: true
        }
    }, {
        schema: 'hris',
        tableName: 'attributeset',
        timestamps: false
    });
    Attributeset.associate = function(model) {
        initRelations(model)
    }
    return Attributeset;
};

const initRelations = (model) => {
    const Attributeset = model.Attributeset;
    const Qaattribute = model.Qaattribute;
    const Questionnaireanswer = model.Questionnaireanswer;

    Attributeset.hasMany(Qaattribute, {
        as: 'QaattributeAttributeIdFkeys',
        foreignKey: 'attribute_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Attributeset.belongsToMany(Questionnaireanswer, {
        as: 'QaattributeAnswers',
        through: Qaattribute,
        foreignKey: 'attribute_id',
        otherKey: 'answer_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

};
