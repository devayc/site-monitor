let deleteSiteId = null;

async function refreshSites() {
    const container = document.getElementById("sites-container");
    if (!container) return;

    try {
        const res = await fetch("/api/sites");
        const sites = await res.json();

        if (sites.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-inbox display-1 text-muted"></i>
                    <p class="mt-3">Нет сайтов для мониторинга</p>
                    <a href="/add" class="btn btn-primary">Добавить первый сайт</a>
                </div>`;
            return;
        }

        container.innerHTML = sites.map(site => renderSiteCard(site)).join("");
        document.getElementById("last-update").textContent = 
            "Обновлено: " + new Date().toLocaleTimeString("ru-RU");
    } catch (e) {
        container.innerHTML = `<div class="col-12 alert alert-danger">Ошибка загрузки: ${e.message}</div>`;
    }
}

function renderSiteCard(site) {
    const isUp = site.is_up === true;
    const statusClass = site.last_status == null ? "status-unknown" : (isUp ? "status-up" : "status-down");
    const statusText = site.last_status == null ? "Не проверен" : (isUp ? "UP" : "DOWN");
    const statusCode = site.last_status ?? "—";
    const rt = site.last_response_time ? `${site.last_response_time} мс` : "—";
    const checked = site.last_checked 
        ? new Date(site.last_checked).toLocaleString("ru-RU") 
        : "Никогда";

    return `
    <div class="col-md-6 col-lg-4">
        <div class="card site-card h-100">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h5 class="card-title mb-0">${escapeHtml(site.name)}</h5>
                    <span class="badge status-badge ${statusClass}">${statusText} ${statusCode}</span>
                </div>
                <p class="card-text small text-muted mb-2">
                    <a href="${site.url}" target="_blank" rel="noopener">${escapeHtml(site.url)}</a>
                </p>
                <div class="small mb-2">
                    <div><i class="bi bi-clock"></i> ${checked}</div>
                    <div class="response-time"><i class="bi bi-speedometer"></i> ${rt}</div>
                    ${site.last_error ? `<div class="text-danger"><i class="bi bi-exclamation-triangle"></i> ${escapeHtml(site.last_error)}</div>` : ""}
                </div>
                <div class="form-check form-switch mb-2">
                    <input class="form-check-input" type="checkbox" id="active-${site.id}" 
                           ${site.is_active ? "checked" : ""} 
                           onchange="toggleSite(${site.id})">
                    <label class="form-check-label small" for="active-${site.id}">
                        ${site.is_active ? "Мониторинг активен" : "Мониторинг выключен"}
                    </label>
                </div>
                <div class="card-actions d-flex gap-2">
                    <button class="btn btn-sm btn-outline-primary" onclick="checkNow(${site.id}, this)">
                        <i class="bi bi-arrow-repeat"></i> Проверить
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="confirmDelete(${site.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>`;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

async function toggleSite(id) {
    try {
        const res = await fetch(`/api/sites/${id}/toggle`, { method: "PATCH" });
        if (!res.ok) throw new Error("Ошибка");
        refreshSites();
    } catch (e) {
        alert("Не удалось изменить статус");
        refreshSites();
    }
}

async function checkNow(id, btn) {
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    try {
        await fetch(`/api/sites/${id}/check`, { method: "POST" });
        await refreshSites();
    } catch (e) {
        alert("Ошибка проверки");
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
}

function confirmDelete(id) {
    deleteSiteId = id;
    new bootstrap.Modal(document.getElementById("deleteModal")).show();
}

document.getElementById("confirmDelete")?.addEventListener("click", async () => {
    if (!deleteSiteId) return;
    try {
        await fetch(`/api/sites/${deleteSiteId}`, { method: "DELETE" });
        bootstrap.Modal.getInstance(document.getElementById("deleteModal")).hide();
        refreshSites();
    } catch (e) {
        alert("Ошибка удаления");
    }
    deleteSiteId = null;
});

// Форма добавления
document.getElementById("add-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    const msg = document.getElementById("form-message");

    try {
        const res = await fetch("/api/sites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || "Ошибка");
        msg.innerHTML = '<div class="alert alert-success">Сайт добавлен! Перенаправление...</div>';
        setTimeout(() => location.href = "/", 1000);
    } catch (err) {
        msg.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    }
});

// Автообновление каждые 15 секунд
if (document.getElementById("sites-container")) {
    refreshSites();
    setInterval(refreshSites, 15000);
}
