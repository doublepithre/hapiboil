/* eslint new-cap: "off", global-require: "off" */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Job', {
        jobId: {
            type: DataTypes.BIGINT,
            field: 'job_id',
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        jobUuid: {
            type: DataTypes.UUID,
            field: 'job_uuid',
            allowNull: false
        },
        jobName: {
            type: DataTypes.STRING,
            field: 'job_name',
            allowNull: true
        },
        jobDescription: {
            type: DataTypes.STRING,
            field: 'job_description',
            allowNull: true
        },
        jobWebsite: {
            type: DataTypes.STRING,
            field: 'job_website',
            allowNull: true
        },
        creatorId: {
            type: DataTypes.BIGINT,
            field: 'creator_id',
            allowNull: true,
            references: {
                model: 'user',
                key: 'user_id'
            },
            onUpdate: 'NO ACTION',
            onDelete: 'NO ACTION'
        },
        active: {
            type: DataTypes.BOOLEAN,
            field: 'active',
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
        tableName: 'jobs',
        timestamps: false
    });
};

module.exports.initRelations = () => {
    delete module.exports.initRelations; // Destroy itself to prevent repeated calls.

    const model = require('../index');
    const Job = model.Job;
    const Jobsquesresponse = model.Jobsquesresponse;
    const User = model.User;

    Job.hasMany(Jobsquesresponse, {
        as: 'QuesresponsesUserIdFkeys',
        foreignKey: 'job_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Job.belongsTo(User, {
        as: 'Creator',
        foreignKey: 'creator_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

};
