import type { DatabaseSync } from 'node:sqlite';
import { CIRCUIT_PRESETS } from '../src/presets/circuitPresets';
import { hashPassword } from './auth';

export function seedDatabase(db: DatabaseSync): void {
  const userCountRow = db.prepare('SELECT COUNT(*) AS cnt FROM users').get() as { cnt: number };
  if (userCountRow.cnt > 0) return;

  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, display_name, university, major, bio)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const u1 = insertUser.run(
    'linxiao',
    hashPassword('123456'),
    '林晓 (电气24级)',
    '华东理工大学',
    '电气工程及其自动化',
    '正在学习模电、数电与电路分析，欢迎交流实验电路！'
  );
  const u2 = insertUser.run(
    'chenyu',
    hashPassword('123456'),
    '陈宇 (模电数电助教)',
    '哈尔滨工业大学',
    '电子信息工程',
    '电工学课程助教，分享典型实验电路与卡诺图化简技巧。'
  );
  const u3 = insertUser.run(
    'suqing',
    hashPassword('123456'),
    '苏晴 (自动化23级)',
    '东南大学',
    '自动化',
    '喜欢用 3D 电路搭建组合逻辑与运放放大电路。'
  );

  const userIds = [Number(u1.lastInsertRowid), Number(u2.lastInsertRowid), Number(u3.lastInsertRowid)];

  // Seed personal projects for linxiao
  const insertProj = db.prepare(`
    INSERT INTO projects (user_id, title, description, category, circuit_json)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertProj.run(
    userIds[0],
    CIRCUIT_PRESETS[0].title,
    CIRCUIT_PRESETS[0].summary,
    CIRCUIT_PRESETS[0].category,
    JSON.stringify(CIRCUIT_PRESETS[0].circuit)
  );
  insertProj.run(
    userIds[0],
    CIRCUIT_PRESETS[2].title,
    CIRCUIT_PRESETS[2].summary,
    CIRCUIT_PRESETS[2].category,
    JSON.stringify(CIRCUIT_PRESETS[2].circuit)
  );

  // Seed 5 Forum Posts
  const insertPost = db.prepare(`
    INSERT INTO forum_posts (
      user_id, title, summary, content, category, tags_json, circuit_json,
      likes_count, comments_count, forks_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const postAuthors = [userIds[1], userIds[0], userIds[1], userIds[2], userIds[2]];
  const initialLikes = [24, 18, 31, 27, 15];
  const initialForks = [12, 9, 19, 14, 7];

  const postIds: number[] = [];
  CIRCUIT_PRESETS.forEach((preset, idx) => {
    const res = insertPost.run(
      postAuthors[idx % postAuthors.length],
      preset.title,
      preset.summary,
      preset.description,
      preset.category,
      JSON.stringify(preset.tags),
      JSON.stringify(preset.circuit),
      initialLikes[idx],
      0,
      initialForks[idx]
    );
    postIds.push(Number(res.lastInsertRowid));
  });

  // Seed comments
  const insertComment = db.prepare(`
    INSERT INTO post_comments (post_id, user_id, content)
    VALUES (?, ?, ?)
  `);
  const updateCommentCount = db.prepare(`
    UPDATE forum_posts SET comments_count = (
      SELECT COUNT(*) FROM post_comments WHERE post_id = ?
    ) WHERE id = ?
  `);

  const seedComments: Array<[number, number, string]> = [
    [
      postIds[0],
      userIds[0],
      '把 RV1 滑臂调到 5% 的时候，电流瞬间飙升，3D 里的红色过载警示圈立刻亮起来了，非常直观！',
    ],
    [
      postIds[0],
      userIds[1],
      '对！这也是实验课上重点强调的：LED 一定要串足够阻值的限流电阻，不能直接跨接在 5V 电压源上。',
    ],
    [
      postIds[2],
      userIds[2],
      '我点开底部的卡诺图面板看了一下，三个 2 元最小项圈刚好对应 AB + BC + AC，和书上的公式一模一样。',
    ],
    [
      postIds[3],
      userIds[0],
      'Fork 过来之后把三个开关全拨到 1，数码管直接显示 3 (S=1, Cout=1)，太好理解全加器原理了！',
    ],
    [
      postIds[4],
      userIds[1],
      '大家把 Rf 改成 8kΩ 试一下，当输出幅值超过 ±12V 供电轨时，运放会进入饱和削顶状态，可以在示波器里清楚看到削波。',
    ],
  ];

  for (const [pid, uid, content] of seedComments) {
    insertComment.run(pid, uid, content);
  }
  for (const pid of postIds) {
    updateCommentCount.run(pid, pid);
  }
}
