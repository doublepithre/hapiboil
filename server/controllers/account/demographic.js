/**
 * Build Questions for demographic questions
 * Questions with empty configurations will fill from database columns
 */

const getDemographicQuestionnaire = async(models) => {
    const { GenderCategory,Education,AutismCategory,Jobtype, Jobfunction, Jobindustry, Joblocation } = models;
    const [genderCategory,education,autismCategory,jobTypes, jobFunctions, jobIndustries, jobLocations] = await Promise.all([
        GenderCategory.findAll({}),
        Education.findAll({}),
        AutismCategory.findAll({raw:true}),
        Jobtype.findAll({}),
        Jobfunction.findAll({}),
        Jobindustry.findAll({}),
        Joblocation.findAll({})
    ]);
    // convert all tables into the format optionId optionName
    let questions = [];
    let autismQuestion = getAutism(autismCategory);
}

const getAutism = (autismCategory) => {
    let obj = {
        questionId:100000,
        questionName: "Are you someone with autism?",
        questionConfig: {
            options: [
            ]
        },
        questionTypeName: "single_choice",
        questionCategoryName: "demographics"
    };
    autismCategory.map(x=>{
        obj.questionConfig.options.push({optionId:x.autismCatId,option_name:x.categoryName})
    });
    return obj;
}

const personLocation = {
    questionId:100001,
    questionName: "Which country are you from?",
    questionConfig: {
        options: [
        ]
    },
    questionTypeName: "single_choice",
    questionCategoryName:"demographics"
}

const age = {
    questionId:100002,
    questionName:"What is your age in years?",
    questionTypeName: "integer"
}

const gender = {
    questionId:100003,
    questionName: "What is your gender?",
    "questionConfig": {
        "options": [
        ]
    },
    questionTypeName: "single_choice"
}

const highestEducation = {
    questionId:100004,
    questionName: "What is your highest level of education?",
    questionConfig: {
        options: [
        ]
    },
    questionTypeName: "single_choice"
}

const educationYear = {
    questionId:100005,
    questionName: "Which year did you attain your highest qualification?",
    questionTypeName: "date", //or integer??
    questionCategoryName: "demographics"
}

const isEmployed = {
    questionId:1000006,
    questionName: "Are you currently employed?",
    questionTypeName: "yes_no",
}

const employmentMonths = {
    questionId:100007,
    questionName: "How many months have you been working for in total (nearest month)?",
    questionTypeName: "integer"
}

const preferredJobLocation = {
    questionId:100008,
    questionName: "What is your most preferred work location?",
    questionTypeName: "integer",
    questionCategoryName: "demographics"
}

const preferredJobType = {
    questionId:100009,
    questionName: "What type of jobs do you prefer most?",
    questionConfig: {
        options: [
        ]
    }
}

const preferredJobFunction = {
    questionId:100010,
    questionName: "What job function do you prefer the most?",
    questionConfig: {
        options: [
        ]
    },
    "questionTypeName": "single_choice",
}

const preferredJobIndustry = {
    questionId:100011,
    questionName: "What industry do you prefer most?",
    questionConfig: {
        options: [
        ]
    },
    "questionTypeName": "single_choice",
}

const IsInTouchNGOs = {
    questionId:100012,
    questionName: "Are you in touch with any NGOs?",
    questionTypeName: "yes_no"
}

const numMonthsInTouchNGOs = {
    questionId:100013,
    questionName: "How many months have you been in touch with the NGO (nearest month)?",
    questionTypeName: "integer"
}

const expectedStartDate = {
    questionId:100014,
    questionName: "What is your expected start date?",
    questionTypeName: "date"
}

module.exports = {
    getDemographicQuestionnaire
}