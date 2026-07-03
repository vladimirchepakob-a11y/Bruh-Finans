// ==========================================
// Finance Pro 2.0
// app.js
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    // ==========================
    // ЭЛЕМЕНТЫ
    // ==========================

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

    // ==========================
    // Проверка DOM
    // ==========================

    if (
        !balanceElement ||
        !incomeElement ||
        !expenseElement ||
        !healthElement
    ) {

        console.error("Dashboard не найден");

        return;

    }

    // ==========================
    // НАВИГАЦИЯ
    // ==========================

    navButtons.forEach(button => {

        button.addEventListener("click", () => {

            navButtons.forEach(btn => {

                btn.classList.remove("active");

            });

            button.classList.add("active");

            const page = button.dataset.page;

            pages.forEach(section => {

                section.classList.remove("active");

            });

            const current = document.getElementById(page);

            if (current) {

                current.classList.add("active");

            }

        });

    });

    // ==========================
    // МОДАЛЬНОЕ ОКНО
    // ==========================

    if (addButton) {

        addButton.onclick = () => {

            modal.classList.remove("hidden");

            titleInput.focus();

        };

    }

    if (closeButton) {

        closeButton.onclick = () => {

            modal.classList.add("hidden");

        };

    }

    window.addEventListener("click", e => {

        if (e.target === modal) {

            modal.classList.add("hidden");

        }

    });

    // ==========================
    // СОХРАНЕНИЕ ОПЕРАЦИИ
    // ==========================

    if (saveButton) {

        saveButton.onclick = () => {

            const title = titleInput.value.trim();

            const amount = Number(amountInput.value);

            const type = typeInput.value;

            if (!title) {

                alert("Введите название");

                return;

            }

            if (amount <= 0) {

                alert("Введите сумму");

                return;

            }

            addOperation({

                id: Date.now(),

                title,

                amount,

                type,

                date: new Date().toLocaleDateString(),

                time: new Date().toLocaleTimeString()

            });

            titleInput.value = "";
            amountInput.value = "";

            modal.classList.add("hidden");

            render();

        };

    }
        // ==========================
    // ОБНОВЛЕНИЕ DASHBOARD
    // ==========================

    function updateDashboard() {

        balanceElement.textContent =
            getBalance().toLocaleString("ru-RU") + " ₽";

        incomeElement.textContent =
            getIncome().toLocaleString("ru-RU") + " ₽";

        expenseElement.textContent =
            getExpenses().toLocaleString("ru-RU") + " ₽";

        healthElement.textContent =
            calculateHealth() + "%";

    }

    // ==========================
    // СОЗДАНИЕ КАРТОЧКИ
    // ==========================

    function createOperation(operation) {

        const card = document.createElement("div");

        card.className = "operation";

        const amountClass =
            operation.type === "income"
                ? "income"
                : "expense";

        const sign =
            operation.type === "income"
                ? "+"
                : "-";

        card.innerHTML = `

            <div class="operation-info">

                <h4>${operation.title}</h4>

                <small>

                    ${operation.date}
                    ${operation.time}

                </small>

            </div>

            <div class="operation-right">

                <div class="${amountClass}">

                    ${sign}${operation.amount.toLocaleString("ru-RU")} ₽

                </div>

                <button class="delete-btn">

                    Удалить

                </button>

            </div>

        `;

        const deleteButton =
            card.querySelector(".delete-btn");

        deleteButton.addEventListener("click", () => {

            if (!confirm("Удалить операцию?")) {

                return;

            }

            removeOperation(operation.id);

            render();

        });

        return card;

    }

    // ==========================
    // ОТРИСОВКА
    // ==========================

    function render() {

        updateDashboard();

        if (operationsContainer) {

            operationsContainer.innerHTML = "";

        }

        if (transactionsContainer) {

            transactionsContainer.innerHTML = "";

        }

        const operations = getOperations();

        if (operations.length === 0) {

            const empty = document.createElement("div");

            empty.className = "empty";

            empty.textContent = "Пока операций нет";

            if (operationsContainer) {

                operationsContainer.appendChild(
                    empty.cloneNode(true)
                );

            }

            if (transactionsContainer) {

                transactionsContainer.appendChild(
                    empty.cloneNode(true)
                );

            }

            return;

        }

        operations.forEach(operation => {

            if (operationsContainer) {

                operationsContainer.appendChild(

                    createOperation(operation)

                );

            }

            if (transactionsContainer) {

                transactionsContainer.appendChild(

                    createOperation(operation)

                );

            }

        });

    }

    // ==========================
    // ПЕРВЫЙ ЗАПУСК
    // ==========================

    
    Dashboard.update();

});