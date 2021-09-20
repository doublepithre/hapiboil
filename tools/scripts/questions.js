/**
 * Javascript helper for getting and answering questions
 * Ask Gary if unsure of anything
 */
dotenv = require('dotenv');
dotenv.config();
const { Client } = require('pg');
const format = require('pg-format');// for safe sql insertion for multi row inserts see https://github.com/brianc/node-postgres/issues/957
 
async function getQuestionnaire(db,company_name){
    try {
        questions = await db.query(`SELECT qn.question_id,qn.question_name,qt.question_type_name,qn.question_config 
        FROM ((hris.questionnaire as qn JOIN hris.questiontype as qt ON qn.question_type_id = qt.question_type_id) 
        JOIN hris.company as c ON qn.company_id = c.company_id) where c.company_name = $1`,[company_name]);
        return questions.rows;
    }catch (err){
        console.log(err.stack);
    }
}
 
/**
 * Still need some experimentation to see which way is the fastest for joining later
 * @param {object} db client object for queries
 * @param {number} userId
 * @param {array} answers arrays of objects with each object {question_id:integer,answer:text/number/array}
 * for data types scale5 scale10 yes_no integer only need to fill in answer with a single number
 * for data types multiple_choice fill in answer with array
 * for data types single_choice fill in answer with number
 * for data types subjective fill in answer with text
 */
async function inputAnswers(db,userId,answers){
    // question_id response_val user_id
    let args = [];
    for (ans of answers){
        let response_val = {answer:ans.answer};
        args.push([ans.question_id,response_val,userId]);
    }
    let query = format("INSERT INTO hris.userquesresponses(question_id,response_val,user_id) VALUES %L",args);
    try {
        await db.query(query);
    }catch (err){
        console.log(err.stack);
    }
}

async function inputJobAnswers(db,jobId,answers){
    // question_id response_val user_id
    let args = [];
    for (ans of answers){
        let response_val = {answer:ans.answer};
        args.push([ans.question_id,response_val,jobId]);
    }
    let query = format("INSERT INTO hris.jobsquesresponses(question_id,response_val,job_id) VALUES %L",args);
    try {
        await db.query(query);
    }catch (err){
        console.log(err.stack);
    }
}
 
function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1) ) + min;
  }
 
function getRndSelection(array){
    return array[Math.floor(Math.random() * array.length)];
}

function createArray(length){
    let array = [];
    for(let i=0;i<length;i++){
        array.push(i);
    }
    return array;
}

function getRndSet(length){
    // random a set of choices
    // random selection size
    let selection_size = Math.max(length-3,getRndInteger(0,length-1));
    // random select from array from selection size
    let array = createArray(length);
    for(let i=0;i<selection_size;i++){
        array.splice(getRndInteger(0,array.length-1),1);
    }
    return array;
}

function createRandomResponses(questions){
    let answers = [];
    for(question of questions){
        if(question.question_type_name==="scale5"){
            answer = getRndInteger(1,5);
        }else if (question.question_type_name==="scale10"){
            answer = getRndInteger(1,10);
        }else if (question.question_type_name==="yes_no"){
            answer = getRndInteger(0,1);
        }else if (question.question_type_name==="integer"){
            answer =  getRndInteger(1,100);
        }else if (question.question_type_name==="single_choice"){
            answer = getRndSelection(question.question_config.options).optionId
        }else if (question.question_type_name==="multiple_choice"){
            answer = getRndSet(question.question_config.options.length);
        }else if (question.question_type_name === "subjective"){
            answer = "test text";
        }
        answers.push({question_id:question.question_id,answer});
    }
    return answers;
}
// Gets all users who are not part of empauwer all i.e. users who are not setting the company questionnaire
async function getUsers(db){
    try{
        let users = await db.query(`SELECT u.user_id,c.company_name
        FROM ((hris.user as u JOIN hris.userinfo AS ui ON u.user_id = ui.user_id) LEFT JOIN hris.company AS c on ui.company_id = c.company_id)
		WHERE c.company_name != 'empauwer all - x0pa' OR c.company_name IS NULL;`);
        return users.rows;
    }catch(err){
        console.log(err.stack)
    }
}
async function createJob(db,userId,jobName,jobDescription,jobWebsite){
    try{
        await db.query(`INSERT INTO hris.jobs(job_name,job_description,job_website,user_id,active)
        VALUES ($1,$2,$3,$4,$5)`,[jobName,jobDescription,jobWebsite,userId,true]);
    }catch(err){
        console.log(err.stack);
    }
}

if (require.main === module) {
    (async()=>{
        client = new Client({
            host: process.env.POSTGRES_HOST,
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.POSTGRES_DB,
            ssl:{
                rejectUnauthorized:false
            }
        });
        await client.connect();
        
        // Fill in answers for all users
        // COMPANY_NAME = "empauwer - x0pa"
        // let questions = await getQuestionnaire(client,COMPANY_NAME);
        // let users = await getUsers(client);
        // for(user of users){
        //     let answers = createRandomResponses(questions);
        //     await inputAnswers(client,user.user_id,answers)
        // }


        // Fill in answers for company questionnaire
        // COMPANY_NAME = 'empauwer all - x0pa'
        // let questions = await getQuestionnaire(client,COMPANY_NAME)
        // let user_id = 106 // this is the user for empauwer all
        // let answers = createRandomResponses(questions);
        // await inputAnswers(client,user_id,answers)

        // Create Jobs
        // COMPANY_NAME = "empauwer all - x0pa"
        // await createJob(client,107,"Backend/Data Engineer/Scientist","Analyze data to find jobs for people","www.testco.jobs.com");
        // let jobId = 1;
        // let questions = await getQuestionnaire(client,COMPANY_NAME);
        // let answers = createRandomResponses(questions);
        // await inputJobAnswers(client,jobId,answers);
        await client.end();
    }   
    )();
}
