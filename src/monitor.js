const axios = require('axios');
const db = require('./db');
const { sendStatusNotification } = require('./notifications');

async function checkSite(site) {
  const start = Date.now();
  let statusCode = null;
  let error = null;
  let responseTime = null;

  try {
    const response = await axios.get(site.url, {
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: () => true, // принимаем любой статус
    });
    statusCode = response.status;
    responseTime = Date.now() - start;
  } catch (err) {
    error = err.message || 'Ошибка соединения';
  }

  const previousStatus = site.last_status;
  const isUp = statusCode === site.expected_status;

  // Обновляем в БД
  const stmt = db.prepare(`
    UPDATE sites SET
      last_status = ?,
      last_response_time = ?,
      last_checked = datetime('now'),
      last_error = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(statusCode, responseTime, error, site.id);

  // Уведомление при изменении
  if (previousStatus !== null && previousStatus !== statusCode) {
    await sendStatusNotification(site, previousStatus, statusCode, error);
  }

  return {
    id: site.id,
    name: site.name,
    url: site.url,
    status: statusCode,
    response_time: responseTime,
    is_up: isUp,
    error,
    last_checked: new Date().toISOString(),
  };
}

async function checkAllActiveSites() {
  const sites = db.prepare('SELECT * FROM sites WHERE is_active = 1').all();
  const results = [];

  for (const site of sites) {
    try {
      const res = await checkSite(site);
      results.push(res);
    } catch (err) {
      console.error(`Ошибка проверки ${site.url}:`, err.message);
    }
  }

  return results;
}

module.exports = { checkSite, checkAllActiveSites };
