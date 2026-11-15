// 跨平台生产入口；环境变量必须在加载服务前生效。
process.env.NODE_ENV = 'production';
await import('./index');
export {};
