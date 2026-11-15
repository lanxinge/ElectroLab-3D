import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createDb } from './db';
import { seedDatabase } from './seed';
import { createApp } from './app';

const PORT = Number(process.env.PORT || 3001);
const db = createDb();
seedDatabase(db);

const app = createApp(db);

if (process.env.NODE_ENV === 'production') {
  const distDir = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[ElectroLab 3D API] listening on http://127.0.0.1:${PORT}`);
});
