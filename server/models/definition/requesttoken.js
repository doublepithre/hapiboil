/* eslint new-cap: "off", global-require: "off" */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Requesttoken', {
        requestId: {
            type: DataTypes.BIGINT,
            field: 'request_id',
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        requestKey: {
            type: DataTypes.STRING,
            field: 'request_key',
            allowNull: false
        },
        expiresAt: {
            type: DataTypes.DATE,
            field: 'expires_at',
            allowNull: true
        },
        userId: {
            type: DataTypes.BIGINT,
            field: 'user_id',
            allowNull: false
        },
        resourceType: {
            type: DataTypes.STRING,
            field: 'resource_type',
            allowNull: true
        },
        actionType: {
            type: DataTypes.STRING,
            field: 'action_type',
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
        tableName: 'requesttoken',
        timestamps: false
    });
};

module.exports.initRelations = () => {
    delete module.exports.initRelations; // Destroy itself to prevent repeated calls.
};
