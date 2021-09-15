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
    let autismQuestion = getAutism(autismCategory);
    let personLocation = getPersonLocation(jobLocations);
    let age = getAge();
    let gender = getGender(genderCategory);
    let highestEducation = getHighestEducation(education);
    let educationYear = getEducationYear();
    let isEmployed = getIsEmployed();
    let employmentMonths = getEmploymentMonths();
    let preferredJobLocation = getPreferredJobLocation(jobLocations);
    let preferredJobType = getPreferredJobType(jobTypes);
    let preferredJobFunction = getPreferredJobFunction(jobFunctions);
    let preferredJobIndustry = getPreferredJobIndustry(jobIndustries);
    let isInTouchNGOs = getIsInTouchNGOs();
    let numMonthsInTouchNGOs = getNumMonthsInTouchNGOs();
    let expectedStartDate = getExpectedStartDate();

    return [
        autismQuestion,
        personLocation,
        age,
        gender,
        highestEducation,
        educationYear,
        isEmployed,
        employmentMonths,
        preferredJobLocation,
        preferredJobType,
        preferredJobFunction,
        preferredJobIndustry,
        isInTouchNGOs,
        numMonthsInTouchNGOs,
        expectedStartDate
    ];
}

const demoQuestionId2Column = {
    100000:"isAutism",
    100001:"personLocation",
    100002:"age",
    100003:"gender",
    100004:"highestEducation",
    100005:"educationYear",
    1000006:"isEmployed",
    100007:"employmentMonths",
    100008:"preferredJobLocation",
    100009:"preferredJobType",
    100010:"preferredJobFunction",
    100011:"preferredJobIndustry",
    100012:"isInTouchNgos",
    100013:"numMonthsInTouchNgos",
    100014:"expectedStartDate"
}

const demoColumn2QuestionId = {
    isAutism: 100000,
    personLocation: 100001,
    age: 100002,
    gender: 100003,
    highestEducation: 100004,
    educationYear: 100005,
    employmentMonths: 100007,
    preferredJobLocation: 100008,
    preferredJobType: 100009,
    preferredJobFunction: 100010,
    preferredJobIndustry: 100011,
    isInTouchNgos: 100012,
    numMonthsInTouchNgos: 100013,
    expectedStartDate: 100014,
    isEmployed: 1000006
}

const updateDemographicAnswers = async(demographicData,Userdemographic) => {
    let userId = demographicData[0]["userId"];
    let row = {userId};
    let timeTaken = {};
    for(let data of demographicData){
        let column = demoQuestionId2Column[data["questionId"]];
        row[column] = data["responseVal"]["answer"];
        timeTaken[data["questionId"]] = data["timeTaken"]
    }
    row["timeTaken"] = timeTaken;
    await Userdemographic.upsert(row);
    let res = await demoRow2Answers(userId,Userdemographic);
    return res;
}

/**
 * 
 * @param {Number} userId 
 * @param {Sequelize} Userdemographic 
 * 
 * Returns responses from question in user demographic table
 * 
 * {isComplete,responses:[{questionId,answer,timeTaken}]}
 */
const demoRow2Answers = async(userId,Userdemographic) => {
    let isComplete = false;

    const row = await Userdemographic.findOne({ where: { userId }, raw: true });
    let responses = []
    if (row) {
        for (const [key, value] of Object.entries(row)) {
            if (key==="userId" || key === "timeTaken" || value == undefined){
                continue;
            }
            let questionId = demoColumn2QuestionId[key];
            responses.push({questionId,responseVal:{answer:value},timeTaken:row["timeTaken"][questionId]});
        }
        isComplete = responses.every((x)=>x.answer!=undefined);
    } 
    return {isComplete,responses}
}

const PART = 0;

const getAutism = (autismCategory) => {
    let obj = {
        questionId:100000,
        questionName: "Are you someone with autism?",
        questionConfig: {
            options: [
            ]
            ,
            desc:""
        },
        questionTypeName: "single_choice",
        questionCategoryName: "demographics",
        part:PART,
        isActive:true
    };
    autismCategory.map(x=>{
        obj.questionConfig.options.push({optionId:x.autismCatId,option_name:x.categoryName})
    });
    obj["questionUuid"] = stringHash(obj.questionName);
    return obj;
}

const getPersonLocation = (jobLocation) => {
    let obj = {
        questionId:100001,
        questionName: "Which country are you from?",
        questionConfig: {
            options: [
            ]
            ,
            desc:""
        },
        questionTypeName: "single_choice",
        questionCategoryName:"demographics",
        part:PART,
        isActive:true
    }
    jobLocation.map(x=>{
        obj.questionConfig.options.push({optionId:x.jobLocationId,optionName:x.jobLocationName})
    })
    obj["questionUuid"] = stringHash(obj.questionName);
    return obj;
}

const getAge = () => {
    let obj = {
        questionId:100002,
        questionName:"What is your age in years?",
        questionConfig: {
            options: [
            ]
            ,
            desc:""
        },
        questionTypeName: "integer",
        questionCategoryName:"demographics",
        part:PART,
        isActive:true
    }
    obj["questionUuid"] = stringHash(obj.questionName);
    return obj
}

const getGender = (genderCategory) => {
    let obj = {
        questionId:100003,
        questionName: "What is your gender?",
        questionConfig: {
            options: [
            ]
            ,
            desc:""
        },
        questionTypeName: "single_choice",
        questionCategoryName:"demographics",
        part:PART,
        isActive:true
    }
    genderCategory.map(x=>{
        obj.questionConfig.options.push({optionId:x.genderId,optionName:x.categoryName})
    });
    obj["questionUuid"] = stringHash(obj.questionName);
    return obj;
}

const getHighestEducation = (education) => {
    let obj ={
        questionId:100004,
        questionName: "What is your highest level of education?",
        questionConfig: {
            options: [
            ]
            ,
            desc:""
        },
        questionTypeName: "single_choice",
        questionCategoryName:"demographics",
        part:PART,
        isActive:true
    }
    education.map(x=>{
        obj.questionConfig.options.push({optionId:x.educationId,optionName:x.educationName})
    });
    obj["questionUuid"] = stringHash(obj.questionName);
    return obj;
}

const getEducationYear = () => {
    let obj = {
        questionId:100005,
        questionName: "Which year did you attain your highest qualification?",
        questionConfig: {
            options: [
            ]
            ,
            desc:""
        },
        questionTypeName: "date", //or integer??
        questionCategoryName: "demographics",
        part:PART,
        isActive:true
    }
    obj["questionUuid"] = stringHash(obj.questionName);
    return obj;
}

const getIsEmployed = () => {
    let obj = {
        questionId:100006,
        questionName: "Are you currently employed?",
        questionConfig: {
            options: [
            ]
            ,
            desc:""
        },
        questionTypeName: "yes_no",
        questionCategoryName:"demographics",
        part:PART,
        isActive:true
    }
    obj["questionUuid"] = stringHash(obj.questionName);
    return obj;
}

const getEmploymentMonths = () => {
    let obj = {
        questionId:100007,
        questionName: "How many months have you been working for in total (nearest month)?",
        questionConfig: {
            options: [
            ]
            ,
            desc:""
        },
        questionTypeName: "integer",
        questionCategoryName:"demographics",
        part:PART,
        isActive:true
    }
    obj["questionUuid"] = stringHash(obj.questionName);
    return obj;
}

const getPreferredJobLocation = (jobLocations) => {
    let obj = {
        questionId:100008,
        questionName: "What is your most preferred work location?",
        questionConfig: {
            options: [
            ]
            ,
            desc:""
        },
        questionTypeName: "single_choice",
        questionCategoryName: "demographics",
        part:PART,
        isActive:true
    }
    jobLocations.map(x=>{
        obj.questionConfig.options.push({optionId:x.jobLocationId,optionName:x.jobLocationName})
    })
    obj["questionUuid"] = stringHash(obj.questionName);
    return obj;
}

const getPreferredJobType = (jobTypes) => {
    let obj = {
        questionId:100009,
        questionName: "What type of jobs do you prefer most?",
        questionConfig: {
            options: [
            ]
            ,
            desc:""
        },
        questionTypeName:"single_choice",
        questionCategoryName:"demographics",
        part:PART,
        isActive:true
    }
    jobTypes.map(x=>{
        obj.questionConfig.options.push({optionId:x.jobTypeId,option_name:x.jobTypeName})
    });
    obj["questionUuid"] = stringHash(obj.questionName);
    return obj;
}

const getPreferredJobFunction = (jobFunctions) => {
    let obj ={
        questionId:100010,
        questionName: "What job function do you prefer the most?",
        questionConfig: {
            options: [
            ]
            ,
            desc:""
        },
        questionTypeName: "single_choice",
        questionCategoryName:"demographics",
        part:PART,
        isActive:true
    }
    jobFunctions.map(x=>{
        obj.questionConfig.options.push({optionId:x.jobFunctionId,option_name:x.jobFunctionName})
    });
    obj["questionUuid"] = stringHash(obj.questionName);
    return obj;
}

const getPreferredJobIndustry = (jobIndustries) => {
    let obj = {
        questionId:100011,
        questionName: "What industry do you prefer most?",
        questionConfig: {
            options: [
            ]
            ,
            desc:""
        },tionTypeName: "single_choice",
        questionCategoryName:"demographics",
        part:PART,
        isActive:true
    }
    jobIndustries.map(x=>{
        obj.questionConfig.options.push({optionId:x.jobIndustryId,option_name:x.jobIndustryName})
    });
    obj["questionUuid"] = stringHash(obj.questionName);
    return obj;
}

const getIsInTouchNGOs = () => {
    let obj = {
        questionId:100012,
        questionName: "Are you in touch with any NGOs?",
        questionConfig: {
            options: [
            ]
            ,
            desc:""
        },
        questionTypeName: "yes_no",
        questionCategoryName:"demographics",
        part:PART,
        isActive:true
    }
    obj["questionUuid"] = stringHash(obj.questionName);
    return obj;
}

const getNumMonthsInTouchNGOs = () => {
    let obj = {
        questionId:100013,
        questionName: "How many months have you been in touch with the NGO (nearest month)?",
        questionConfig: {
            options: [
            ]
            ,
            desc:""
        },
        questionTypeName: "integer",
        questionCategoryName:"demographics",
        part:PART,
        isActive:true
    }
    obj["questionUuid"] = stringHash(obj.questionName);
    return obj;
}

const getExpectedStartDate = () => {
    let obj = {
        questionId:100014,
        questionName: "What is your expected start date?",
        questionConfig: {
            options: [
            ]
            ,
            desc:""
        },
        questionTypeName: "date",
        questionCategoryName:"demographics",
        part:PART,
        isActive:true
    }
    obj["questionUuid"] = stringHash(obj.questionName);
    return obj;
}

const stringHash = function(str, seed = 821) {
    /**
     * Fixed uuid based on string
     * https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
     */
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
    h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1>>>0)).toString();
};

module.exports = {
    getDemographicQuestionnaire,
    demoQuestionId2Column,
    updateDemographicAnswers,
    demoRow2Answers
}