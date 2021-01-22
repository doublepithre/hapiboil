/* eslint global-require: "off" */
const model = {};
let initialized = false;

/**
 * Initializes sequelize models and their relations.
 * @param   {Object} sequelize  - Sequelize instance.
 * @returns {Object}            - Sequelize models.
 */
function init(sequelize) {
    delete module.exports.init; // Destroy itself to prevent repeated calls and clash with a model named 'init'.
    initialized = true;
    // Import model files and assign them to `model` object.
    model.Attributeset = sequelize.import('./definition/attributeset.js');
    model.Company = sequelize.import('./definition/company.js');
    model.Job = sequelize.import('./definition/jobs.js');
    model.Jobsquesresponse = sequelize.import('./definition/jobsquesresponses.js');
    model.Qaattribute = sequelize.import('./definition/qaattribute.js');
    model.Questioncategory = sequelize.import('./definition/questioncategory.js');
    model.Questionmapping = sequelize.import('./definition/questionmapping.js');
    model.Questionnaire = sequelize.import('./definition/questionnaire.js');
    model.Questionnaireanswer = sequelize.import('./definition/questionnaireanswers.js');
    model.Questiontype = sequelize.import('./definition/questiontype.js');
    model.User = sequelize.import('./definition/user.js');
    model.Userinfo = sequelize.import('./definition/userinfo.js');
    model.Userquesresponse = sequelize.import('./definition/userquesresponses.js');
    model.Userrole = sequelize.import('./definition/userrole.js');
    model.Usertype = sequelize.import('./definition/usertype.js');
    model.Accesstoken = sequelize.import('./definitions/accesstoken.js');
    model.Companyinfo = sequelize.import('./definitions/companyinfo.js');
    model.Emaillogs = sequelize.import('./definitions/emaillogs.js');
    model.Emailtemplates = sequelize.import('./definition/emailtemplates.js');
    model.Requesttoken = sequelize.import('./definition/requesttoken.js');

    // All models are initialized. Now connect them with relations.
    require('./definition/attributeset.js').initRelations();
    require('./definition/company.js').initRelations();
    require('./definition/jobs.js').initRelations();
    require('./definition/jobsquesresponses.js').initRelations();
    require('./definition/qaattribute.js').initRelations();
    require('./definition/questioncategory.js').initRelations();
    require('./definition/questionmapping.js').initRelations();
    require('./definition/questionnaire.js').initRelations();
    require('./definition/questionnaireanswers.js').initRelations();
    require('./definition/questiontype.js').initRelations();
    require('./definition/user.js').initRelations();
    require('./definition/userinfo.js').initRelations();
    require('./definition/userquesresponses.js').initRelations();
    require('./definition/userrole.js').initRelations();
    require('./definition/usertype.js').initRelations();
    require('./definition/accesstoken.js').initRelations();
    require('./definition/companyinfo.js').initRelations();
    require('./definition/emaillogs.js').initRelations();
    require('./definition/emailtemplates.js').initRelations();
    require('./definition/requesttoken.js').initRelations();
    return model;
}

// Note: While using this module, DO NOT FORGET FIRST CALL model.init(sequelize). Otherwise you get undefined.
module.exports = model;
module.exports.init = init;
module.exports.isInitialized = initialized;
