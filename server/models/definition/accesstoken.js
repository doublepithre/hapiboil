/* eslint new-cap: "off", global-require: "off" */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Accesstoken', {
        token: {
            type: DataTypes.TEXT,
            field: 'token',
            allowNull: false,
            primaryKey: true
        },
        userId: {
            type: DataTypes.BIGINT,
            field: 'user_id',
            allowNull: false
        },
        isValid: {
            type: DataTypes.BOOLEAN,
            field: 'is_valid',
            allowNull: true
        },
        createdAt: {
            type: DataTypes.DATE,
            field: 'created_at',
            allowNull: true
        }
    }, {
        schema: 'hris',
        tableName: 'accesstoken',
        timestamps: false
    });
};

module.exports.initRelations = () => {
    delete module.exports.initRelations; // Destroy itself to prevent repeated calls.
};
