/* eslint new-cap: "off", global-require: "off" */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Jobapplications', {
        applicationId: {
            type: DataTypes.BIGINT,
            field: 'application_id',
            allowNull: false,
            autoIncrement: true
        },
        jobId: {
            type: DataTypes.BIGINT,
            field: 'job_id',
            allowNull: false,
            primaryKey: true
        },
        userId: {
            type: DataTypes.BIGINT,
            field: 'user_id',
            allowNull: false,
            primaryKey: true
        },
        isApplied: {
            type: DataTypes.BOOLEAN,
            field: 'is_applied',
            allowNull: true
        },
        status: {
            type: DataTypes.STRING,
            field: 'status',
            allowNull: true
        },
        isWithdrawn: {
            type: DataTypes.BOOLEAN,
            field: 'is_withdrawn',
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
        tableName: 'jobapplications',
        timestamps: false
    });
};

module.exports.initRelations = () => {
    delete module.exports.initRelations; // Destroy itself to prevent repeated calls.
};
