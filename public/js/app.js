let deleteSiteId = null;

async function refreshSites() {
    const container = document.getElementById("sites-container");
    if (!container) return;

    try {
        const res = await fetch("/api/sites");
        const sites = await res.json();

        if (sites.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-inbox display-4 text-muted"></i>
                    <p class="mt-3">Нет сайтов для мониторинга</p>
                    <a href="/add" class="btn btn-primary">Добавить первый сайт</a>
                </div>`;
            return;
        }

        container.innerHTML = sites.map(site => renderSiteItem(site)).join("");
        const lastUpdate = document.getElementById("last-update");
        if (lastUpdate) {
            lastUpdate.textContent = "Обновлено: " + new Date().toLocaleTimeString("ru-RU");
        }
    } catch (e) {
        container.innerHTML = `<div class="alert alert-danger">Ошибка загрузки: ${e.message}</div>`;
    }
}

function renderSiteItem(site) {
    const isUp = site.is_up === true;
    const statusClass = site.last_status == null ? "unknown" : (isUp ? "up" : "down");
    const statusCode = site.last_status ?? "—";
    const rt = site.last_response_time ? `${site.last_response_time} мс` : "—";
    const checked = site.last_checked 
        ? new Date(site.last_checked).toLocaleString("ru-RU") 
        : "Не проверялся";

    return `
    <div class="site-item">
        <div class="status-indicator ${statusClass}" title="${isUp ? 'OK' : (site.last_status ? 'Проблема' : 'Не проверен')}"></div>
        <div class="site-info">
            <div class="site-name">${escapeHtml(site.name)}</div>
            <a class="site-url" href="${site.url}" target="_blank" rel="noopener">${escapeHtml(site.url)}</a>
            <div class="site-meta">
                <span><i class="bi bi-clock"></i> ${checked}</span>
                <span><i class="bi bi-speedometer"></i> ${rt}</span>
                ${site.last_error ? `<span class="text-danger"><i class="bi bi-exclamation-triangle"></i> ${escapeHtml(site.last_error)}</span>` : ""}
            </div>
        </div>
        <div class="site-actions">
            <span class="status-code ${statusClass}">${statusCode}</span>
            <div class="form-check form-switch mb-0">
                <input class="form-check-input" type="checkbox" id="active-${site.id}" 
                       ${site.is_active ? "checked" : ""} 
                       onchange="toggleSite(${site.id})"
                       title="Мониторинг">
            </div>
            <button class="btn btn-sm btn-outline-secondary" onclick="checkNow(${site.id}, this)" title="Проверить сейчас">
                <i class="bi bi-arrow-repeat"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="confirmDelete(${site.id})" title="Удалить">
                <i class="bi bi-trash"></i>
            </button>
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
