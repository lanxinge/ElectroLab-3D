import express from 'express';
import cors from 'cors';
import type { DatabaseSync } from 'node:sqlite';
import { hashPassword, optionalAuth, requireAuth, signToken, verifyPassword } from './auth';

function isValidCircuitData(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const c = obj as Record<string, unknown>;
  return Array.isArray(c.components) && Array.isArray(c.wires);
}

function isValidCustomIcPayload(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;
  if (typeof p.name !== 'string' || !p.name.trim()) return false;
  if (!Array.isArray(p.pins) || p.pins.length < 1 || p.pins.length > 24) return false;
  return isValidCircuitData(p.internalCircuit);
}

function parseJsonSafe<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function createApp(db: DatabaseSync): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'ElectroLab 3D API' });
  });

  // ==================== AUTH ROUTES ====================
  app.post('/api/auth/register', (req, res) => {
    const { username, password, displayName, university, major, bio } = req.body ?? {};
    const cleanUser = String(username ?? '').trim().toLowerCase();
    const cleanPass = String(password ?? '');
    const cleanName = String(displayName ?? cleanUser).trim();

    if (!cleanUser || cleanUser.length < 3 || !/^[a-z0-9_]+$/.test(cleanUser)) {
      res.status(400).json({ error: '用户名需至少 3 个字符，仅支持英文字母、数字或下划线' });
      return;
    }
    if (cleanPass.length < 6) {
      res.status(400).json({ error: '密码长度至少需要 6 位' });
      return;
    }
    if (!cleanName) {
      res.status(400).json({ error: '请输入昵称或姓名' });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUser);
    if (existing) {
      res.status(409).json({ error: '该用户名已被注册，请更换用户名' });
      return;
    }

    const pwHash = hashPassword(cleanPass);
    const info = db
      .prepare(
        `INSERT INTO users (username, password_hash, display_name, university, major, bio)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        cleanUser,
        pwHash,
        cleanName,
        String(university ?? '工科电工电子实验中心').trim() || '工科电工电子实验中心',
        String(major ?? '电气工程及其自动化').trim() || '电气工程及其自动化',
        String(bio ?? '').trim()
      );

    const userId = Number(info.lastInsertRowid);
    const user = db
      .prepare(
        `SELECT id, username, display_name AS displayName, university, major, bio, created_at AS createdAt
         FROM users WHERE id = ?`
      )
      .get(userId);
    const token = signToken(userId, cleanUser);
    res.status(201).json({ token, user });
  });

  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body ?? {};
    const cleanUser = String(username ?? '').trim().toLowerCase();
    const cleanPass = String(password ?? '');
    if (!cleanUser || !cleanPass) {
      res.status(400).json({ error: '请输入用户名和密码' });
      return;
    }

    const row = db
      .prepare(
        `SELECT id, username, password_hash, display_name AS displayName, university, major, bio, created_at AS createdAt
         FROM users WHERE username = ?`
      )
      .get(cleanUser) as
      | {
          id: number;
          username: string;
          password_hash: string;
          displayName: string;
          university: string;
          major: string;
          bio: string;
          createdAt: string;
        }
      | undefined;

    if (!row || !verifyPassword(cleanPass, row.password_hash)) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    const token = signToken(row.id, row.username);
    const { password_hash: _ignored, ...user } = row;
    res.json({ token, user });
  });

  app.get('/api/auth/me', requireAuth, (req, res) => {
    const user = db
      .prepare(
        `SELECT id, username, display_name AS displayName, university, major, bio, created_at AS createdAt
         FROM users WHERE id = ?`
      )
      .get(req.authUser!.userId);
    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }
    res.json({ user });
  });

  app.patch('/api/auth/profile', requireAuth, (req, res) => {
    const { displayName, university, major, bio } = req.body ?? {};
    const current = db
      .prepare('SELECT display_name, university, major, bio FROM users WHERE id = ?')
      .get(req.authUser!.userId) as
      | { display_name: string; university: string; major: string; bio: string }
      | undefined;
    if (!current) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    db.prepare(
      `UPDATE users SET display_name = ?, university = ?, major = ?, bio = ? WHERE id = ?`
    ).run(
      String(displayName ?? current.display_name).trim() || current.display_name,
      String(university ?? current.university).trim() || current.university,
      String(major ?? current.major).trim() || current.major,
      String(bio ?? current.bio).trim(),
      req.authUser!.userId
    );

    const updated = db
      .prepare(
        `SELECT id, username, display_name AS displayName, university, major, bio, created_at AS createdAt
         FROM users WHERE id = ?`
      )
      .get(req.authUser!.userId);
    res.json({ user: updated });
  });

  // ==================== PERSONAL PROJECTS ROUTES ====================
  app.get('/api/projects', requireAuth, (req, res) => {
    const rows = db
      .prepare(
        `SELECT id, user_id AS userId, title, description, category, circuit_json, created_at AS createdAt, updated_at AS updatedAt
         FROM projects WHERE user_id = ? ORDER BY updated_at DESC, id DESC`
      )
      .all(req.authUser!.userId) as Array<Record<string, unknown>>;

    const projects = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      title: r.title,
      description: r.description,
      category: r.category,
      circuitData: parseJsonSafe(String(r.circuit_json), { components: [], wires: [] }),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
    res.json({ projects });
  });

  app.post('/api/projects', requireAuth, (req, res) => {
    const { title, description, category, circuitData } = req.body ?? {};
    const cleanTitle = String(title ?? '').trim();
    if (!cleanTitle) {
      res.status(400).json({ error: '项目名称不能为空' });
      return;
    }
    if (!isValidCircuitData(circuitData)) {
      res.status(400).json({ error: '无效的电路数据结构' });
      return;
    }

    const info = db
      .prepare(
        `INSERT INTO projects (user_id, title, description, category, circuit_json)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        req.authUser!.userId,
        cleanTitle,
        String(description ?? '').trim(),
        String(category ?? '综合设计').trim(),
        JSON.stringify(circuitData)
      );

    const created = db
      .prepare(
        `SELECT id, user_id AS userId, title, description, category, circuit_json, created_at AS createdAt, updated_at AS updatedAt
         FROM projects WHERE id = ?`
      )
      .get(Number(info.lastInsertRowid)) as Record<string, unknown>;

    res.status(201).json({
      project: {
        ...created,
        circuitData: parseJsonSafe(String(created.circuit_json), { components: [], wires: [] }),
      },
    });
  });

  app.put('/api/projects/:id', requireAuth, (req, res) => {
    const projectId = Number(req.params.id);
    const existing = db
      .prepare('SELECT id, user_id FROM projects WHERE id = ?')
      .get(projectId) as { id: number; user_id: number } | undefined;
    if (!existing) {
      res.status(404).json({ error: '未找到该项目' });
      return;
    }
    if (existing.user_id !== req.authUser!.userId) {
      res.status(403).json({ error: '无权修改他人项目' });
      return;
    }

    const { title, description, category, circuitData } = req.body ?? {};
    const cleanTitle = String(title ?? '').trim();
    if (!cleanTitle || !isValidCircuitData(circuitData)) {
      res.status(400).json({ error: '项目标题与电路数据均为必填项' });
      return;
    }

    db.prepare(
      `UPDATE projects
       SET title = ?, description = ?, category = ?, circuit_json = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      cleanTitle,
      String(description ?? '').trim(),
      String(category ?? '综合设计').trim(),
      JSON.stringify(circuitData),
      projectId
    );

    const updated = db
      .prepare(
        `SELECT id, user_id AS userId, title, description, category, circuit_json, created_at AS createdAt, updated_at AS updatedAt
         FROM projects WHERE id = ?`
      )
      .get(projectId) as Record<string, unknown>;
    res.json({
      project: {
        ...updated,
        circuitData: parseJsonSafe(String(updated.circuit_json), { components: [], wires: [] }),
      },
    });
  });

  app.delete('/api/projects/:id', requireAuth, (req, res) => {
    const projectId = Number(req.params.id);
    const existing = db
      .prepare('SELECT id, user_id FROM projects WHERE id = ?')
      .get(projectId) as { id: number; user_id: number } | undefined;
    if (!existing) {
      res.status(404).json({ error: '未找到该项目' });
      return;
    }
    if (existing.user_id !== req.authUser!.userId) {
      res.status(403).json({ error: '无权删除他人项目' });
      return;
    }
    db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
    res.json({ ok: true });
  });

  // ==================== FORUM ROUTES ====================
  app.get('/api/forum/posts', optionalAuth, (req, res) => {
    const category = String(req.query.category ?? '').trim();
    const q = String(req.query.q ?? '').trim();
    const sort = String(req.query.sort ?? 'latest').trim();

    const whereClauses: string[] = [];
    const params: (string | number)[] = [];

    if (category && category !== '全部') {
      whereClauses.push('p.category = ?');
      params.push(category);
    }
    if (q) {
      whereClauses.push('(p.title LIKE ? OR p.summary LIKE ? OR p.content LIKE ? OR u.display_name LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const orderSql =
      sort === 'likes'
        ? 'ORDER BY p.likes_count DESC, p.id DESC'
        : 'ORDER BY p.created_at DESC, p.id DESC';

    const rows = db
      .prepare(
        `SELECT
           p.id, p.user_id AS userId, u.display_name AS authorName, u.university AS authorUniversity,
           u.major AS authorMajor, p.title, p.summary, p.content, p.category, p.tags_json,
           p.circuit_json, p.likes_count AS likesCount, p.comments_count AS commentsCount,
           p.forks_count AS forksCount, p.created_at AS createdAt
         FROM forum_posts p
         JOIN users u ON p.user_id = u.id
         ${whereSql}
         ${orderSql}`
      )
      .all(...params) as Array<Record<string, unknown>>;

    const likedSet = new Set<number>();
    if (req.authUser) {
      const likedRows = db
        .prepare('SELECT post_id FROM post_likes WHERE user_id = ?')
        .all(req.authUser.userId) as Array<{ post_id: number }>;
      for (const lr of likedRows) likedSet.add(lr.post_id);
    }

    const posts = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      authorName: r.authorName,
      authorUniversity: r.authorUniversity,
      authorMajor: r.authorMajor,
      title: r.title,
      summary: r.summary,
      content: r.content,
      category: r.category,
      tags: parseJsonSafe<string[]>(String(r.tags_json), []),
      circuitData: parseJsonSafe(String(r.circuit_json), { components: [], wires: [] }),
      likesCount: r.likesCount,
      commentsCount: r.commentsCount,
      forksCount: r.forksCount,
      likedByMe: likedSet.has(Number(r.id)),
      createdAt: r.createdAt,
    }));

    res.json({ posts });
  });

  app.get('/api/forum/posts/:id', optionalAuth, (req, res) => {
    const postId = Number(req.params.id);
    const r = db
      .prepare(
        `SELECT
           p.id, p.user_id AS userId, u.display_name AS authorName, u.university AS authorUniversity,
           u.major AS authorMajor, p.title, p.summary, p.content, p.category, p.tags_json,
           p.circuit_json, p.likes_count AS likesCount, p.comments_count AS commentsCount,
           p.forks_count AS forksCount, p.created_at AS createdAt
         FROM forum_posts p
         JOIN users u ON p.user_id = u.id
         WHERE p.id = ?`
      )
      .get(postId) as Record<string, unknown> | undefined;

    if (!r) {
      res.status(404).json({ error: '未找到该论坛作品帖子' });
      return;
    }

    let likedByMe = false;
    if (req.authUser) {
      const liked = db
        .prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?')
        .get(postId, req.authUser.userId);
      likedByMe = Boolean(liked);
    }

    const comments = db
      .prepare(
        `SELECT
           c.id, c.post_id AS postId, c.user_id AS userId, u.display_name AS authorName,
           u.university AS authorUniversity, u.major AS authorMajor, c.content, c.created_at AS createdAt
         FROM post_comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.post_id = ?
         ORDER BY c.created_at ASC, c.id ASC`
      )
      .all(postId);

    res.json({
      post: {
        id: r.id,
        userId: r.userId,
        authorName: r.authorName,
        authorUniversity: r.authorUniversity,
        authorMajor: r.authorMajor,
        title: r.title,
        summary: r.summary,
        content: r.content,
        category: r.category,
        tags: parseJsonSafe<string[]>(String(r.tags_json), []),
        circuitData: parseJsonSafe(String(r.circuit_json), { components: [], wires: [] }),
        likesCount: r.likesCount,
        commentsCount: r.commentsCount,
        forksCount: r.forksCount,
        likedByMe,
        createdAt: r.createdAt,
        comments,
      },
    });
  });

  app.post('/api/forum/posts', requireAuth, (req, res) => {
    const { title, summary, content, category, tags, circuitData } = req.body ?? {};
    const cleanTitle = String(title ?? '').trim();
    const cleanContent = String(content ?? '').trim();
    if (!cleanTitle) {
      res.status(400).json({ error: '作品标题不能为空' });
      return;
    }
    if (!cleanContent) {
      res.status(400).json({ error: '请填写电路原理说明或实验心得' });
      return;
    }
    if (!isValidCircuitData(circuitData)) {
      res.status(400).json({ error: '电路数据格式无效' });
      return;
    }

    const cleanTags = Array.isArray(tags)
      ? tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 6)
      : [];
    const cleanSummary =
      String(summary ?? '').trim() ||
      cleanContent.slice(0, 80) + (cleanContent.length > 80 ? '...' : '');

    const info = db
      .prepare(
        `INSERT INTO forum_posts (user_id, title, summary, content, category, tags_json, circuit_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.authUser!.userId,
        cleanTitle,
        cleanSummary,
        cleanContent,
        String(category ?? '综合设计').trim() || '综合设计',
        JSON.stringify(cleanTags),
        JSON.stringify(circuitData)
      );

    const newId = Number(info.lastInsertRowid);
    const created = db
      .prepare(
        `SELECT
           p.id, p.user_id AS userId, u.display_name AS authorName, u.university AS authorUniversity,
           u.major AS authorMajor, p.title, p.summary, p.content, p.category, p.tags_json,
           p.circuit_json, p.likes_count AS likesCount, p.comments_count AS commentsCount,
           p.forks_count AS forksCount, p.created_at AS createdAt
         FROM forum_posts p
         JOIN users u ON p.user_id = u.id
         WHERE p.id = ?`
      )
      .get(newId) as Record<string, unknown>;

    res.status(201).json({
      post: {
        ...created,
        tags: cleanTags,
        circuitData,
        likedByMe: false,
      },
    });
  });

  app.delete('/api/forum/posts/:id', requireAuth, (req, res) => {
    const postId = Number(req.params.id);
    const existing = db
      .prepare('SELECT id, user_id FROM forum_posts WHERE id = ?')
      .get(postId) as { id: number; user_id: number } | undefined;
    if (!existing) {
      res.status(404).json({ error: '未找到该帖子' });
      return;
    }
    if (existing.user_id !== req.authUser!.userId) {
      res.status(403).json({ error: '仅作者本人可删除此帖子' });
      return;
    }
    db.prepare('DELETE FROM forum_posts WHERE id = ?').run(postId);
    res.json({ ok: true });
  });

  app.post('/api/forum/posts/:id/like', requireAuth, (req, res) => {
    const postId = Number(req.params.id);
    const post = db.prepare('SELECT id, likes_count FROM forum_posts WHERE id = ?').get(postId) as
      | { id: number; likes_count: number }
      | undefined;
    if (!post) {
      res.status(404).json({ error: '未找到该帖子' });
      return;
    }

    const existing = db
      .prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?')
      .get(postId, req.authUser!.userId);

    let liked = false;
    if (existing) {
      db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').run(
        postId,
        req.authUser!.userId
      );
      db.prepare(
        'UPDATE forum_posts SET likes_count = MAX(0, likes_count - 1) WHERE id = ?'
      ).run(postId);
      liked = false;
    } else {
      db.prepare('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)').run(
        postId,
        req.authUser!.userId
      );
      db.prepare('UPDATE forum_posts SET likes_count = likes_count + 1 WHERE id = ?').run(postId);
      liked = true;
    }

    const updated = db
      .prepare('SELECT likes_count AS likesCount FROM forum_posts WHERE id = ?')
      .get(postId) as { likesCount: number };

    res.json({ liked, likesCount: updated.likesCount });
  });

  app.post('/api/forum/posts/:id/fork', optionalAuth, (req, res) => {
    const postId = Number(req.params.id);
    const post = db
      .prepare('SELECT id, title, circuit_json, forks_count FROM forum_posts WHERE id = ?')
      .get(postId) as
      | { id: number; title: string; circuit_json: string; forks_count: number }
      | undefined;
    if (!post) {
      res.status(404).json({ error: '未找到该帖子' });
      return;
    }

    db.prepare('UPDATE forum_posts SET forks_count = forks_count + 1 WHERE id = ?').run(postId);
    const updated = db
      .prepare('SELECT forks_count AS forksCount FROM forum_posts WHERE id = ?')
      .get(postId) as { forksCount: number };

    res.json({
      title: post.title,
      circuitData: parseJsonSafe(post.circuit_json, { components: [], wires: [] }),
      forksCount: updated.forksCount,
    });
  });

  app.post('/api/forum/posts/:id/comments', requireAuth, (req, res) => {
    const postId = Number(req.params.id);
    const post = db.prepare('SELECT id FROM forum_posts WHERE id = ?').get(postId);
    if (!post) {
      res.status(404).json({ error: '未找到该帖子' });
      return;
    }
    const content = String(req.body?.content ?? '').trim();
    if (!content) {
      res.status(400).json({ error: '评论内容不能为空' });
      return;
    }

    const info = db
      .prepare('INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)')
      .run(postId, req.authUser!.userId, content);

    db.prepare(
      `UPDATE forum_posts SET comments_count = (
         SELECT COUNT(*) FROM post_comments WHERE post_id = ?
       ) WHERE id = ?`
    ).run(postId, postId);

    const comment = db
      .prepare(
        `SELECT
           c.id, c.post_id AS postId, c.user_id AS userId, u.display_name AS authorName,
           u.university AS authorUniversity, u.major AS authorMajor, c.content, c.created_at AS createdAt
         FROM post_comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.id = ?`
      )
      .get(Number(info.lastInsertRowid));

    const postRow = db
      .prepare('SELECT comments_count AS commentsCount FROM forum_posts WHERE id = ?')
      .get(postId) as { commentsCount: number };

    res.status(201).json({ comment, commentsCount: postRow.commentsCount });
  });

  // ==================== CLOUD CUSTOM IC ROUTES ====================
  app.get('/api/custom-ics', requireAuth, (req, res) => {
    const rows = db
      .prepare(
        `SELECT id, user_id AS userId, name, code_name AS codeName, description, color, ic_json,
                created_at AS createdAt, updated_at AS updatedAt
         FROM custom_ics
         WHERE user_id = ?
         ORDER BY updated_at DESC, id DESC`
      )
      .all(req.authUser!.userId) as Array<Record<string, unknown>>;

    const customIcs = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      name: r.name,
      codeName: r.codeName,
      description: r.description,
      color: r.color,
      icPayload: parseJsonSafe(String(r.ic_json), null),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
    res.json({ customIcs });
  });

  app.post('/api/custom-ics', requireAuth, (req, res) => {
    const { icPayload } = req.body ?? {};
    if (!isValidCustomIcPayload(icPayload)) {
      res.status(400).json({ error: '自定义集成芯片封装数据结构无效（至少需要名称、引脚与内部电路）' });
      return;
    }

    const cleanName = String(icPayload.name).trim();
    const cleanCode = String(icPayload.codeName ?? 'U').trim().slice(0, 8) || 'U';
    const cleanDesc = String(icPayload.description ?? '').trim();
    const cleanColor = String(icPayload.color ?? '#0284c7').trim() || '#0284c7';
    const normalizedPayload = {
      ...icPayload,
      version: 1,
      name: cleanName,
      codeName: cleanCode,
      description: cleanDesc,
      color: cleanColor,
    };

    const info = db
      .prepare(
        `INSERT INTO custom_ics (user_id, name, code_name, description, color, ic_json)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.authUser!.userId,
        cleanName,
        cleanCode,
        cleanDesc,
        cleanColor,
        JSON.stringify(normalizedPayload)
      );

    const created = db
      .prepare(
        `SELECT id, user_id AS userId, name, code_name AS codeName, description, color, ic_json,
                created_at AS createdAt, updated_at AS updatedAt
         FROM custom_ics WHERE id = ?`
      )
      .get(Number(info.lastInsertRowid)) as Record<string, unknown>;

    res.status(201).json({
      customIc: {
        id: created.id,
        userId: created.userId,
        name: created.name,
        codeName: created.codeName,
        description: created.description,
        color: created.color,
        icPayload: parseJsonSafe(String(created.ic_json), normalizedPayload),
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      },
    });
  });

  app.put('/api/custom-ics/:id', requireAuth, (req, res) => {
    const icId = Number(req.params.id);
    const existing = db
      .prepare('SELECT id, user_id FROM custom_ics WHERE id = ?')
      .get(icId) as { id: number; user_id: number } | undefined;
    if (!existing) {
      res.status(404).json({ error: '未找到该云端集成芯片' });
      return;
    }
    if (existing.user_id !== req.authUser!.userId) {
      res.status(403).json({ error: '无权修改他人封装的集成芯片' });
      return;
    }

    const { icPayload } = req.body ?? {};
    if (!isValidCustomIcPayload(icPayload)) {
      res.status(400).json({ error: '自定义集成芯片封装数据结构无效' });
      return;
    }

    const cleanName = String(icPayload.name).trim();
    const cleanCode = String(icPayload.codeName ?? 'U').trim().slice(0, 8) || 'U';
    const cleanDesc = String(icPayload.description ?? '').trim();
    const cleanColor = String(icPayload.color ?? '#0284c7').trim() || '#0284c7';
    const normalizedPayload = {
      ...icPayload,
      version: 1,
      name: cleanName,
      codeName: cleanCode,
      description: cleanDesc,
      color: cleanColor,
    };

    db.prepare(
      `UPDATE custom_ics
       SET name = ?, code_name = ?, description = ?, color = ?, ic_json = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      cleanName,
      cleanCode,
      cleanDesc,
      cleanColor,
      JSON.stringify(normalizedPayload),
      icId
    );

    const updated = db
      .prepare(
        `SELECT id, user_id AS userId, name, code_name AS codeName, description, color, ic_json,
                created_at AS createdAt, updated_at AS updatedAt
         FROM custom_ics WHERE id = ?`
      )
      .get(icId) as Record<string, unknown>;

    res.json({
      customIc: {
        id: updated.id,
        userId: updated.userId,
        name: updated.name,
        codeName: updated.codeName,
        description: updated.description,
        color: updated.color,
        icPayload: parseJsonSafe(String(updated.ic_json), normalizedPayload),
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  });

  app.delete('/api/custom-ics/:id', requireAuth, (req, res) => {
    const icId = Number(req.params.id);
    const existing = db
      .prepare('SELECT id, user_id FROM custom_ics WHERE id = ?')
      .get(icId) as { id: number; user_id: number } | undefined;
    if (!existing) {
      res.status(404).json({ error: '未找到该云端集成芯片' });
      return;
    }
    if (existing.user_id !== req.authUser!.userId) {
      res.status(403).json({ error: '无权删除他人封装的集成芯片' });
      return;
    }
    db.prepare('DELETE FROM custom_ics WHERE id = ?').run(icId);
    res.json({ ok: true });
  });

  return app;
}
