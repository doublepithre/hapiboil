/* eslint new-cap: "off", global-require: "off" */

module.exports = (sequelize, DataTypes) => {
    const Userquesresponse = sequelize.define('Userquesresponse', {
        responseId: {
            type: DataTypes.BIGINT,
            field: 'response_id',
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        questionId: {
            type: DataTypes.BIGINT,
            field: 'question_id',
            allowNull: false
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
    const Userinfo = model.Userinfo;

    Userquesresponse.belongsTo(Userinfo, {
        as: 'User',
        foreignKey: 'user_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

};
