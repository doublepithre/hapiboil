const fs = require('fs');

function mcqFinal(rawJSON) {
  const quesMap = rawJSON.mcQuesMap;
  const finalResult = {
    total: rawJSON.total,
    quesMap: {}
  };


  // looping through all questions to get the final result data
  for (let quesId of Object.keys(quesMap)) {
    // console.log(quesId); //questionId

    const ansCountMap = new Map();

    // looping through each answer for that question
    // then saving them on the hashtable { answerItem: count }
    // in short, counting the number 
    // for how many times all (users) answered that answer item
    for (let ansItem of quesMap[quesId].answersArray) {
      for (let ans of ansItem.answer) {

        if (ansCountMap.get(ans) === undefined) {
          ansCountMap.set(ans, Number(ansItem.count));
        } else {
          ansCountMap.set(ans, Number(ansCountMap.get(ans)) + Number(ansItem.count));
        }

      }
    }

    // saving top three answerItems for each question along with their count
    const t3AnswerItems = Array.from(ansCountMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);

    finalResult.quesMap[quesId] = {
      question_type_name: quesMap[quesId].question_type_name,
      top3answers: [], //[{ count: maxCount, answer: maxAnswer }]
    }



    // COMBO LOGIC ONWARDS
    const top3AnswerItemsArr = t3AnswerItems.map(item => item[0]);
    const t3Hash = new Map();
    t3AnswerItems.forEach(([k, v]) => {
      t3Hash.set(k, v);
    })
    const topAnsItemsAllComboCounts = {};

    for (let topItem of top3AnswerItemsArr) {

      // for each topItem, loop the answersArray
      // and count all their combos
      for (let ansItem of quesMap[quesId].answersArray) {
        if (ansItem.answer.includes(topItem)) {

          if (!topAnsItemsAllComboCounts[topItem]) topAnsItemsAllComboCounts[topItem] = {}
          topAnsItemsAllComboCounts[topItem][JSON.stringify(ansItem.answer.sort((a, b) => a - b))] = topAnsItemsAllComboCounts[topItem][JSON.stringify(ansItem.answer.sort((a, b) => a - b))] ? topAnsItemsAllComboCounts[topItem][JSON.stringify(ansItem.answer)] + Number(ansItem.count) : Number(ansItem.count);

        }
      }
    }


    let topThreeComboArr;
    const combos = {};
    Object.entries(topAnsItemsAllComboCounts).forEach(([topAnsItemKey, val]) => {
      const value = val;

      topThreeComboArr = Array.from(Object.entries(value).sort((a, b) => b - a)).slice(0, 3);

      for (let [topCombo, comboCount] of topThreeComboArr) {
        if (!combos[topAnsItemKey]) combos[topAnsItemKey] = {};
        combos[topAnsItemKey][topCombo] = comboCount;
      }
      // console.log(combos);

    });

    // for this question, for this top answer, push data (combo + self count);
    for (let t3AnswerItem of t3AnswerItems) {
      if (t3AnswerItem) {
        finalResult.quesMap[quesId].top3answers.push({
          count: t3AnswerItem[1],
          answer: t3AnswerItem[0],
          top3combos: combos[t3AnswerItem[0]],
        })
      }

    }
  }

  return finalResult;
}

module.exports = mcqFinal;