// ==============================
// Finance Pro 2.0
// app.js
// ==============================

// ---------- Элементы ----------

const pages = document.querySelectorAll(".page");
const navButtons = document.querySelectorAll(".nav-btn");

const modal = document.getElementById("operationModal");

const addButton = document.getElementById("addOperation");
const saveButton = document.getElementById("saveOperation");
const closeButton = document.getElementById("closeModal");

const titleInput = document.getElementById("title");
const amountInput = document.getElementById("amount");
const typeInput = document.getElementById("type");

const balanceElement = document.getElementById("balance");
const incomeElement = document.getElementById("income");
const expenseElement = document.getElementById("expenses");
const healthElement = document.getElementById("health");

const operationsContainer = document.getElementById("operations");
const transactionsContainer = document.getElementById("transactionsList");

// ---------- Навигация ----------

navButtons.forEach(button=>{

    button.addEventListener("click",()=>{

        navButtons.forEach(btn=>btn.classList.remove("active"));

        button.classList.add("active");

        const page = button.dataset.page;

        pages.forEach(section=>{

            section.classList.remove("active");

        });

        document
            .getElementById(page)
            .classList.add("active");

    });

});

// ---------- Модальное окно ----------

addButton.onclick=()=>{

    modal.classList.remove("hidden");

}

closeButton.onclick=()=>{

    modal.classList.add("hidden");

}

modal.onclick=e=>{

    if(e.target===modal){

        modal.classList.add("hidden");

    }

}

// ---------- Добавление операции ----------

saveButton.onclick=()=>{

    const title=titleInput.value.trim();

    const amount=Number(amountInput.value);

    const type=typeInput.value;

    if(title===""){

        alert("Введите название");

        return;

    }

    if(amount<=0){

        alert("Введите сумму");

        return;

    }

    addOperation({

        id:Date.now(),

        title,

        amount,

        type,

        date:new Date().toLocaleDateString(),

        time:new Date().toLocaleTimeString()

    });

    titleInput.value="";
    amountInput.value="";

    modal.classList.add("hidden");

    render();

}

// ---------- Отрисовка ----------

function render(){

    balanceElement.innerText=
        getBalance().toLocaleString()+" ₽";

    incomeElement.innerText=
        getIncome().toLocaleString()+" ₽";

    expenseElement.innerText=
        getExpenses().toLocaleString()+" ₽";

    healthElement.innerText=
        calculateHealth()+"%";

    operationsContainer.innerHTML="";

    transactionsContainer.innerHTML="";

    const operations=getOperations();

    if(operations.length===0){

        operationsContainer.innerHTML=

        `<div class="empty">

        Пока операций нет

        </div>`;

        transactionsContainer.innerHTML=

        `<div class="empty">

        Пока операций нет

        </div>`;

        return;

    }

    operations.forEach(operation=>{

        const item=createOperation(operation);

        operationsContainer.appendChild(item);

        transactionsContainer.appendChild(
            item.cloneNode(true)
        );

    });

}

// ---------- Карточка операции ----------

function createOperation(operation){

    const div=document.createElement("div");

    div.className="operation";

    div.innerHTML=`

        <div>

            <h4>${operation.title}</h4>

            <small>

            ${operation.date}

            ${operation.time}

            </small>

        </div>

        <div>

            <div class="${operation.type}">

                ${operation.type==="income" ? "+" : "-"}

                ${operation.amount.toLocaleString()} ₽

            </div>

            <button
                data-id="${operation.id}"
                class="delete-btn">

                ✕

            </button>

        </div>

    `;

    div
    .querySelector(".delete-btn")
    .onclick=()=>{

        if(confirm("Удалить операцию?")){

            removeOperation(operation.id);

            render();

        }

    };

    return div;

}

// ---------- Первый запуск ----------

render();