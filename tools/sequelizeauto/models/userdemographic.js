const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Userdemographic', {
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: {
          tableName: 'userinfo',
          schema: 'hris'
        },
        key: 'user_id'
      },
      field: 'user_id'
    },
    isAutism: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'is_autism'
    },
    personLocation: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'joblocation',
          schema: 'hris'
        },
        key: 'job_location_id'
      },
      field: 'person_location'
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    gender: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    highestEducation: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'highest_education'
    },
    educationYear: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'education_year'
    },
    isEmployed: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'is_employed'
    },
    employmentMonths: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'employment_months'
    },
    preferredJobLocation: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'joblocation',
          schema: 'hris'
        },
        key: 'job_location_id'
      },
      field: 'preferred_job_location'
    },
    preferredJobType: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'jobtype',
          schema: 'hris'
        },
        key: 'job_type_id'
      },
      field: 'preferred_job_type'
    },
    preferredJobFunction: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'jobfunction',
          schema: 'hris'
        },
        key: 'job_function_id'
      },
      field: 'preferred_job_function'
    },
    preferredJobIndustry: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'jobindustry',
          schema: 'hris'
        },
        key: 'job_industry_id'
      },
      field: 'preferred_job_industry'
    },
    isInTouchNgos: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'is_in_touch_ngos'
    },
    numMonthsInTouchNgos: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'num_months_in_touch_ngos'
    },
    expectedStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'expected_start_date'
    },
    timeTaken: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'time_taken'
    }
  }, {
    sequelize,
    tableName: 'userdemographic',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "userdemographic_pkey",
        unique: true,
        fields: [
          { name: "user_id" },
        ]
      },
    ]
  });
};
