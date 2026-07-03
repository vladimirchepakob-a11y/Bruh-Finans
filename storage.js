// ==============================
// Finance Pro 2.0
// storage.js
// ==============================

const STORAGE_KEY = "finance_pro_data_v1";

const defaultData = {

    balance: 0,

    income: 0,

    expenses: 0,

    operations: [],

    sidejobs: [],

    investments: [],

    goals: [],

    savings: [],

    settings: {

        currency: "₽",

        theme: "light"

    }

};

// ------------------------------

let financeData = loadData();

// ------------------------------

function loadData(){

    const saved = localStorage.getItem(STORAGE_KEY);

    if(saved){

        try{

            return JSON.parse(saved);

        }catch(e){

            console.error(e);

        }

    }

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(defaultData)
    );

    return structuredClone(defaultData);

}

// ------------------------------

function saveData(){

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(financeData)
    );

}

// ------------------------------

function resetDatabase(){

    financeData = structuredClone(defaultData);

    saveData();

}

// ------------------------------

function addOperation(operation){

    financeData.operations.unshift(operation);

    if(operation.type==="income"){

        financeData.income += operation.amount;

        financeData.balance += operation.amount;

    }

    if(operation.type==="expense"){

        financeData.expenses += operation.amount;

        financeData.balance -= operation.amount;

    }

    saveData();

}

// ------------------------------

function removeOperation(id){

    const index = financeData.operations.findIndex(
        item=>item.id===id
    );

    if(index===-1) return;

    const operation = financeData.operations[index];

    if(operation.type==="income"){

        financeData.income -= operation.amount;

        financeData.balance -= operation.amount;

    }

    if(operation.type==="expense"){

        financeData.expenses -= operation.amount;

        financeData.balance += operation.amount;

    }

    financeData.operations.splice(index,1);

    saveData();

}

// ------------------------------

function getBalance(){

    return financeData.balance;

}

function getIncome(){

    return financeData.income;

}

function getExpenses(){

    return financeData.expenses;

}

function getOperations(){

    return financeData.operations;

}

// ------------------------------

function calculateHealth(){

    if(financeData.income===0){

        return 100;

    }

    let percent = Math.round(

        ((financeData.income-financeData.expenses)

        /financeData.income)

        *100

    );

    percent=Math.max(0,percent);

    percent=Math.min(100,percent);

    return percent;

}

// ------------------------------

function exportData(){

    return JSON.stringify(

        financeData,

        null,

        2

    );

}

// ------------------------------

function importData(json){

    try{

        financeData = JSON.parse(json);

        saveData();

        return true;

    }

    catch{

        return false;

    }

}