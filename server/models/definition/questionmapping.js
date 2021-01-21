/* eslint new-cap: "off", global-require: "off" */

module.exports = (sequelize, DataTypes) => {
    const Questionmapping = sequelize.define('Questionmapping', {
        qmId: {
            type: DataTypes.BIGINT,
            field: 'qm_id',
            allowNull: false,
            autoIncrement: true,
            primaryKey: true
        },
        empauwerAllQid: {
            type: DataTypes.BIGINT,
            field: 'empauwer_all_qid',
            allowNull: true,
            references: {
                model: 'questionnaire',
                key: 'question_id'
            },
            onUpdate: 'NO ACTION',
            onDelete: 'NO ACTION'
        },
        empauwerMeQid: {
            type: DataTypes.BIGINT,
            field: 'empauwer_me_qid',
            allowNull: true,
            references: {
                model: 'questionnaire',
                key: 'question_id'
            },
            onUpdate: 'NO ACTION',
            onDelete: 'NO ACTION'
        },
        mappingValue: {
            type: DataTypes.FLOAT(24),
            field: 'mapping_value',
            allowNull: true,
            defaultValue: 1.0
        }
    }, {
        schema: 'hris',
        tableName: 'questionmapping',
        timestamps: false
    });
    Questionmapping.associate = function(model) {
        initRelations(model)
    }
    return Questionmapping;
};

const initRelations = (model) => {
    const Questionmapping = model.Questionmapping;
    const Questionnaire = model.Questionnaire;

    Questionmapping.belongsTo(Questionnaire, {
        as: 'EmpauwerAllQ',
        foreignKey: 'empauwer_all_qid',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Questionmapping.belongsTo(Questionnaire, {
        as: 'EmpauwerMeQ',
        foreignKey: 'empauwer_me_qid',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

};
