/**
 * Workr Queue - Memory-based job queue
 */

const EventEmitter = require('events');

class Queue extends EventEmitter {
  constructor() {
    super();
    this.jobs = new Map();      // jobId -> job
    this.pending = [];          // 待處理的 jobId（按優先級排序）
    this.running = new Map();   // 正在執行的 jobId -> worker
    this.completed = [];        // 已完成的 jobId（最近 100 個）
    this.isProcessing = false;
  }

  // 產生 Job ID
  generateId() {
    return 'job_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  // 加入任務
  add(type, payload, options = {}) {
    const jobId = this.generateId();
    const job = {
      id: jobId,
      type,
      payload,
      priority: options.priority ?? 2,
      callback: options.callback || null,
      status: 'queued',
      progress: 0,
      result: null,
      error: null,
      retries: 0,
      maxRetries: options.maxRetries ?? 3,
      createdAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
      duration: null
    };

    this.jobs.set(jobId, job);

    // 按優先級插入
    const insertIndex = this.pending.findIndex(id => {
      const j = this.jobs.get(id);
      return j && j.priority > job.priority;
    });

    if (insertIndex === -1) {
      this.pending.push(jobId);
    } else {
      this.pending.splice(insertIndex, 0, jobId);
    }

    console.log(`[queue] Job added: ${jobId} (${type}), pending: ${this.pending.length}`);
    this.emit('job:added', job);

    return job;
  }

  // 取得下一個待處理任務
  next(type = null) {
    for (let i = 0; i < this.pending.length; i++) {
      const jobId = this.pending[i];
      const job = this.jobs.get(jobId);

      if (!job) continue;
      if (type && job.type !== type) continue;

      // 移出 pending
      this.pending.splice(i, 1);
      return job;
    }
    return null;
  }

  // 標記任務開始
  start(jobId, workerId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    job.status = 'running';
    job.startedAt = new Date().toISOString();
    this.running.set(jobId, workerId);

    console.log(`[queue] Job started: ${jobId}`);
    this.emit('job:started', job);

    return job;
  }

  // 更新進度
  progress(jobId, progress, message = null) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.progress = progress;
    this.emit('job:progress', { job, progress, message });
  }

  // 任務完成
  complete(jobId, result) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    job.status = 'completed';
    job.progress = 100;
    job.result = result;
    job.finishedAt = new Date().toISOString();
    job.duration = new Date(job.finishedAt) - new Date(job.startedAt);

    this.running.delete(jobId);
    this.completed.unshift(jobId);
    if (this.completed.length > 100) {
      const oldId = this.completed.pop();
      this.jobs.delete(oldId);
    }

    console.log(`[queue] Job completed: ${jobId} (${job.duration}ms)`);
    this.emit('job:completed', job);

    // Callback
    if (job.callback) {
      this.sendCallback(job);
    }

    return job;
  }

  // 任務失敗
  fail(jobId, error) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    job.retries++;
    this.running.delete(jobId);

    // 重試
    if (job.retries < job.maxRetries) {
      console.log(`[queue] Job retry ${job.retries}/${job.maxRetries}: ${jobId}`);
      job.status = 'queued';
      job.error = error;
      this.pending.unshift(jobId); // 放回佇列前面
      this.emit('job:retry', job);
      return job;
    }

    // 真正失敗
    job.status = 'failed';
    job.error = error;
    job.finishedAt = new Date().toISOString();
    job.duration = job.startedAt
      ? new Date(job.finishedAt) - new Date(job.startedAt)
      : 0;

    this.completed.unshift(jobId);
    if (this.completed.length > 100) {
      const oldId = this.completed.pop();
      this.jobs.delete(oldId);
    }

    console.log(`[queue] Job failed: ${jobId} - ${error}`);
    this.emit('job:failed', job);

    // Callback
    if (job.callback) {
      this.sendCallback(job);
    }

    return job;
  }

  // 取消任務
  cancel(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    // 只能取消 queued 狀態的任務
    if (job.status !== 'queued') {
      return null;
    }

    const index = this.pending.indexOf(jobId);
    if (index > -1) {
      this.pending.splice(index, 1);
    }

    job.status = 'cancelled';
    job.finishedAt = new Date().toISOString();

    console.log(`[queue] Job cancelled: ${jobId}`);
    this.emit('job:cancelled', job);

    return job;
  }

  // 取得任務
  get(jobId) {
    return this.jobs.get(jobId);
  }

  // 列出任務
  list(filter = {}) {
    const { status, type, limit = 20 } = filter;
    let result = Array.from(this.jobs.values());

    if (status) {
      result = result.filter(j => j.status === status);
    }
    if (type) {
      result = result.filter(j => j.type === type);
    }

    // 按建立時間倒序
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return result.slice(0, limit);
  }

  // 取得統計
  stats() {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      queued: this.pending.length,
      running: this.running.size,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length
    };
  }

  // 發送 Callback
  async sendCallback(job) {
    try {
      await fetch(job.callback, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          type: job.type,
          status: job.status,
          result: job.result,
          error: job.error,
          duration: job.duration
        })
      });
      console.log(`[queue] Callback sent: ${job.id} -> ${job.callback}`);
    } catch (e) {
      console.error(`[queue] Callback failed: ${job.id} - ${e.message}`);
    }
  }

  // 停止
  stop() {
    this.isProcessing = false;
    this.removeAllListeners();
  }
}

// Singleton
const queue = new Queue();

module.exports = queue;
