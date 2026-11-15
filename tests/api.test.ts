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

  it('returns seeded forum posts with circuit previews', async () => {
    const res = await request(app).get('/api/forum/posts');
    expect(res.status).toBe(200);
    expect(res.body.posts.length).toBe(CIRCUIT_PRESETS.length);
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

  it('supports authenticated Cloud Custom IC CRUD and rejects unauthorized/cross-user writes', async () => {
    // 1. Unauthenticated request returns 401
    const unauth = await request(app).get('/api/custom-ics');
    expect(unauth.status).toBe(401);

    // 2. Authenticate two distinct users
    const regA = await request(app).post('/api/auth/register').send({
      username: 'ic_owner_a',
      password: 'password123',
      displayName: '芯片作者A',
      university: '清华大学',
      major: '集成电路学院',
    });
    expect(regA.status).toBe(201);
    const tokenA = regA.body.token as string;

    const regB = await request(app).post('/api/auth/register').send({
      username: 'ic_other_b',
      password: 'password123',
      displayName: '同学B',
      university: '北京大学',
      major: '微电子',
    });
    expect(regB.status).toBe(201);
    const tokenB = regB.body.token as string;

    const samplePayload = {
      version: 1,
      name: '我的云端反相器',
      codeName: 'U_INV',
      description: '单输入数字非门封装单元',
      color: '#7c3aed',
      pins: [
        { pinId: 'in1', name: 'A', direction: 'in', anchorCompId: 'pin_in' },
        { pinId: 'out1', name: 'Y', direction: 'out', anchorCompId: 'pin_out' },
      ],
      internalCircuit: {
        components: [
          {
            id: 'pin_in',
            type: 'IC_PORT_IN',
            label: 'IN1',
            pos3d: [-2, 0, 0],
            rotationY: 0,
            pos2d: { x: 100, y: 150 },
            rot2d: 0,
            props: { state: 0, portName: 'A' },
          },
          {
            id: 'g1',
            type: 'NOT',
            label: 'U1',
            pos3d: [0, 0, 0],
            rotationY: 0,
            pos2d: { x: 250, y: 150 },
            rot2d: 0,
            props: {},
          },
          {
            id: 'pin_out',
            type: 'IC_PORT_OUT',
            label: 'OUT1',
            pos3d: [2, 0, 0],
            rotationY: 0,
            pos2d: { x: 400, y: 150 },
            rot2d: 0,
            props: { portName: 'Y' },
          },
        ],
        wires: [
          { id: 'w1', from: { componentId: 'pin_in', pinId: 'io' }, to: { componentId: 'g1', pinId: 'a' }, color: '#38bdf8' },
          { id: 'w2', from: { componentId: 'g1', pinId: 'y' }, to: { componentId: 'pin_out', pinId: 'io' }, color: '#22c55e' },
        ],
      },
    };

    // 3. Create Custom IC
    const createRes = await request(app)
      .post('/api/custom-ics')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ icPayload: samplePayload });
    expect(createRes.status).toBe(201);
    expect(createRes.body.customIc.name).toBe('我的云端反相器');
    const icId = createRes.body.customIc.id as number;

    // 4. List returns saved IC for owner A, empty for B
    const listA = await request(app)
      .get('/api/custom-ics')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(listA.status).toBe(200);
    expect(listA.body.customIcs.some((c: { id: number }) => c.id === icId)).toBe(true);

    const listB = await request(app)
      .get('/api/custom-ics')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(listB.status).toBe(200);
    expect(listB.body.customIcs.some((c: { id: number }) => c.id === icId)).toBe(false);

    // 5. Cross-user PUT and DELETE return 403
    const forbiddenPut = await request(app)
      .put(`/api/custom-ics/${icId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ icPayload: { ...samplePayload, name: '篡改名称' } });
    expect(forbiddenPut.status).toBe(403);

    const forbiddenDel = await request(app)
      .delete(`/api/custom-ics/${icId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(forbiddenDel.status).toBe(403);

    // 6. Owner PUT & DELETE succeed
    const updateRes = await request(app)
      .put(`/api/custom-ics/${icId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ icPayload: { ...samplePayload, name: '已更新云端反相器' } });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.customIc.name).toBe('已更新云端反相器');

    const delRes = await request(app)
      .delete(`/api/custom-ics/${icId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(delRes.status).toBe(200);
  });
});
