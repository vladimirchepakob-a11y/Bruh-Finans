// ========================================
// Finance Pro 2.0
// dashboard.js
// ========================================

const Dashboard = (() => {

    function update() {

        updateHealth();

        updateSafety();

        updateStatistics();

    }

    // ===========================
    // Финансовое здоровье
    // ===========================

    function updateHealth() {

        const element = document.getElementById("health");

        if (!element) return;

        const income = getIncome();

        const expenses = getExpenses();

        if (income === 0) {

            element.textContent = "100%";

            return;

        }

        let score = Math.round(
            ((income - expenses) / income) * 100
        );

        score = Math.max(0, score);
        score = Math.min(100, score);

        element.textContent = score + "%";

        element.classList.remove(
            "health-good",
            "health-normal",
            "health-bad"
        );

        if (score >= 80) {

            element.classList.add("health-good");

        } else if (score >= 50) {

            element.classList.add("health-normal");

        } else {

            element.classList.add("health-bad");

        }

    }

    // ===========================
    // Финансовая подушка
    // ===========================

    function updateSafety() {

        const card = document.getElementById("safetyDays");

        if (!card) return;

        const balance = getBalance();

        const expenses = getExpenses();

        if (expenses === 0) {

            card.textContent = "∞";

            return;

        }

        const daily = expenses / 30;

        const days = Math.floor(balance / daily);

        card.textContent = days;

    }

    // ===========================
    // Статистика
    // ===========================

    function updateStatistics() {

        const operations = getOperations();

        const count = document.getElementById("operationsCount");

        if (count) {

            count.textContent = operations.length;

        }

    }

    return {

        update

    };

})();