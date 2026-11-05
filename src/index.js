const express = require('express');
const path = require('path');
const { initDB, prepare } = require('./db');
const { checkSite, checkAllActiveSites } = require('./monitor');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// --- API ---

app.get('/api/sites', (req, res) => {
  const sites = prepare('SELECT * FROM sites ORDER BY name').all();
  res.json(
    sites.map((s) => ({
      ...s,
      is_active: !!s.is_active,
      is_up: s.last_status === s.expected_status ? true : s.last_status == null ? null : false,
    }))
  );
});

app.post('/api/sites', (req, res) => {
  const { name, url, expected_status = 200, check_interval = 60, notify_emails = '' } = req.body;

  if (!name || !url) {
    return res.status(400).json({ detail: 'Название и URL обязательны' });
  }

  try {
    const result = prepare(`
      INSERT INTO sites (name, url, expected_status, check_interval, notify_emails, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(name, url, Number(expected_status), Number(check_interval), notify_emails || null);

    res.json({ id: result.lastInsertRowid, message: 'Сайт добавлен' });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ detail: 'Сайт с таким URL уже существует' });
    }
    res.status(500).json({ detail: err.message });
  }
});

app.patch('/api/sites/:id/toggle', (req, res) => {
  const site = prepare('SELECT * FROM sites WHERE id = ?').get(req.params.id);
  if (!site) return res.status(404).json({ detail: 'Сайт не найден' });

  const newActive = site.is_active ? 0 : 1;
  prepare('UPDATE sites SET is_active = ?, updated_at = datetime("now") WHERE id = ?').run(
    newActive,
    req.params.id
  );

  res.json({ is_active: !!newActive });
});

app.delete('/api/sites/:id', (req, res) => {
  const result = prepare('DELETE FROM sites WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ detail: 'Сайт не найден' });
  res.json({ message: 'Сайт удалён' });
});

app.post('/api/sites/:id/check', async (req, res) => {
  const site = prepare('SELECT * FROM sites WHERE id = ?').get(req.params.id);
  if (!site) return res.status(404).json({ detail: 'Сайт не найден' });

  try {
    const result = await checkSite(site);
    res.json(result);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Статические страницы
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/add', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/add.html'));
});

// Запуск
async function start() {
  await initDB();
  console.log('База данных готова');

  // Автозаполнение списком сайтов, если база пустая
  const existing = prepare('SELECT COUNT(*) as cnt FROM sites').get();
  if (existing && existing.cnt === 0) {
    const seedSites = [
      { name: 'Bonnashop', url: 'https://bonnashop.ru/' },
      { name: 'Monin Masterglass', url: 'https://monin-masterglass.ru/' },
      { name: 'Status Ivanovo', url: 'https://statusivanovo.ru/' },
      { name: 'Iva Sorti', url: 'https://ivassorti.ru/' },
      { name: 'Okna Balkony 37', url: 'https://okna-balkony37.ru/' },
      { name: 'IvaTex', url: 'https://ivatex.ru/' },
      { name: 'Best Label', url: 'https://bestlabel.ru/' },
      { name: 'Prime Label', url: 'https://prime-label.ru/' },
      { name: 'Create Label', url: 'https://createlabel.ru/' },
      { name: 'IWT Pro', url: 'https://iwt-pro.ru/' },
      { name: 'Потолки 37', url: 'https://потолки37.рф/' },
      { name: 'VIP Party', url: 'https://vip-party.ru/' },
      { name: 'TR Design', url: 'https://tr-design.ru/' },
      { name: 'Женский трикотаж', url: 'https://jenskiy-trikotaj.ru/' },
      { name: 'Гидротех-центр 37', url: 'https://гидротех-центр37.рф/' },
      { name: 'UM OK 37', url: 'https://um-ok37.ru/' },
      { name: 'Garant 37', url: 'https://garant-37.ru/' },
      { name: 'Span Group', url: 'https://spangroup.ru/' },
      { name: 'Shturman 37', url: 'https://shturman37.ru/' },
      { name: 'Illuminator 3000', url: 'https://illuminator3000.ru/' },
      { name: 'Basic Look', url: 'https://basiclook.store/' },
    ];

    const insert = prepare(`
      INSERT INTO sites (name, url, expected_status, check_interval, is_active)
      VALUES (?, ?, 200, 60, 1)
    `);

    for (const site of seedSites) {
      try {
        insert.run(site.name, site.url);
      } catch (e) {
        // ignore duplicates
      }
    }
    console.log(`Добавлено ${seedSites.length} сайтов`);
  }

  const interval = parseInt(process.env.DEFAULT_CHECK_INTERVAL || '60');
  setInterval(async () => {
    console.log('Проверка активных сайтов...');
    await checkAllActiveSites();
  }, interval * 1000);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Site Monitor запущен: http://localhost:${PORT}`);
  });
}

start().catch(console.error);
