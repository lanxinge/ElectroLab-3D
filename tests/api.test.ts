import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { DatabaseSync } from 'node:sqlite';
import { createDb } from '../server/db';
import { seedDatabase } from '../server/seed';
import { createApp } from '../server/app';
import { CIRCUIT_PRESETS } from '../src/presets/circuitPresets';

describe('ElectroLab 3D Full-Stack REST API', () => {
  let db: DatabaseSync;
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    db = createDb(':memory:');
    seedDatabase(db);
    app = createApp(db);
  });

  afterAll(() => {
    db.close();
  });

  it('GET /api/health returns ok: true', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 5 seeded forum posts with circuit previews', async () => {
    const res = await request(app).get('/api/forum/posts');
    expect(res.status).toBe(200);
    expect(res.body.posts.length).toBe(5);
    expect(res.body.posts[0].circuitData.components.length).toBeGreaterThan(0);
  });

  it('supports user registration, login, cloud projects CRUD, forum publish, like, comment, and fork', async () => {
    // 1. Register new student
    const reg = await request(app).post('/api/auth/register').send({
      username: 'test_ee_student',
      password: 'password123',
      displayName: '测试同学',
      university: '同济大学',
      major: '电子科学与技术',
    });
    expect(reg.status).toBe(201);
    expect(reg.body.token).toBeTruthy();
    const token = reg.body.token as string;

    // 2. Login with seeded user
    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'linxiao',
      password: '123456',
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.username).toBe('linxiao');

    // 3. Save personal project
    const projRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: '我的分压测试电路',
        description: '测试保存',
        category: '模电基础',
        circuitData: CIRCUIT_PRESETS[0].circuit,
      });
    expect(projRes.status).toBe(201);
    const projectId = projRes.body.project.id as number;

    const listProj = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`);
    expect(listProj.status).toBe(200);
    expect(listProj.body.projects.some((p: { id: number }) => p.id === projectId)).toBe(true);

    // 4. Publish circuit post to Forum
    const pubRes = await request(app)
      .post('/api/forum/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: '全加器实验心得分享',
        content: '实测三位二进制输入下，数码管显示完全正确！',
        category: '数电逻辑',
        tags: ['全加器', '测试'],
        circuitData: CIRCUIT_PRESETS[3].circuit,
      });
    expect(pubRes.status).toBe(201);
    const postId = pubRes.body.post.id as number;

    // 5. Like post
    const likeRes = await request(app)
      .post(`/api/forum/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`);
    expect(likeRes.status).toBe(200);
    expect(likeRes.body.liked).toBe(true);
    expect(likeRes.body.likesCount).toBe(1);

    // 6. Add Comment
    const commentRes = await request(app)
      .post(`/api/forum/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '支持！清晰易懂' });
    expect(commentRes.status).toBe(201);
    expect(commentRes.body.commentsCount).toBe(1);

    // 7. Fork post
    const forkRes = await request(app).post(`/api/forum/posts/${postId}/fork`);
    expect(forkRes.status).toBe(200);
    expect(forkRes.body.forksCount).toBe(1);
    expect(forkRes.body.circuitData.components.length).toBeGreaterThan(0);

    // 8. Clean delete project
    const delProj = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delProj.status).toBe(200);
  });
});
