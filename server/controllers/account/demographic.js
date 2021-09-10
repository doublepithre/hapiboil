/**
 * Build Questions for demographic questions
 * Questions with empty configurations will fill from database columns
 */

const isAutism = {
    questionName: "Are you someone with autism?",
    questionConfig: {
        options: [
        ]
    },
    questionTypeName: "single_choice",
    questionCategoryName: "demographics"
}

const personLocation = {
    questionName: "Which country are you from?",
    questionConfig: {
        options: [
        ]
    },
    questionTypeName: "single_choice",
    questionCategoryName:"demographics"
}

const age = {
    questionName:"What is your age in years?",
    questionTypeName: "integer"
}

const gender = {
    questionName: "What is your gender?",
    "questionConfig": {
        "options": [
        ]
    },
    questionTypeName: "single_choice"
}

const highestEducation = {
    questionName: "What is your highest level of education?",
    questionConfig: {
        options: [
        ]
    },
    questionTypeName: single_choice
}

const educationYear = {
    questionName: "Which year did you attain your highest qualification?",
    questionTypeName: "date", //or integer??
    questionCategoryName: "demographics"
}

const isEmployed = {
    questionName: "Are you currently employed?",
    questionTypeName: "yes_no",
}

const employmentMonths = {
    questionName: "How many months have you been working for in total (nearest month)?",
    questionTypeName: "integer"
}

const preferredJobLocation = {
    questionName: "What is your most preferred work location?",
    questionTypeName: "integer",
    questionCategoryName: "demographics"
}

const preferredJobType = {
    questionName: "What type of jobs do you prefer most?",
    questionConfig: {
        options: [
        ]
    }
}

const preferredJobFunction = {
    questionName: "What job function do you prefer the most?",
    questionConfig: {
        options: [
        ]
    },
    "questionTypeName": "single_choice",
}

const preferredJobIndustry = {
    questionName: "What industry do you prefer most?",
    questionConfig: {
        options: [
        ]
    },
    "questionTypeName": "single_choice",
}

const IsInTouchNGOs = {
    questionName: "Are you in touch with any NGOs?",
    questionTypeName: "yes_no"
}

const numMonthsInTouchNGOs = {
    questionName: "How many months have you been in touch with the NGO (nearest month)?",
    questionTypeName: "integer"
}

const expectedStartDate = {
    questionName: "What is your expected start date?",
    questionTypeName: "date"
}