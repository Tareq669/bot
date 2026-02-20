const { safeSend } = require('./helpers');

class SendQueue {
  constructor({ concurrency = 3, delayMs = 300 } = {}) {
    this.concurrency = concurrency;
    this.delayMs = delayMs;
    this.queue = [];
    this.active = 0;
  }

  enqueue(bot, chatId, text, options = {}) {
    return new Promise((resolve, reject) => {
      this.queue.push({ bot, chatId, text, options, resolve, reject });
      this._maybeProcess();
    });
  }

  async _maybeProcess() {
    if (this.active >= this.concurrency) return;
    const job = this.queue.shift();
    if (!job) return;
    this.active++;
    try {
      const res = await safeSend(job.bot, job.chatId, job.text, job.options);
      job.resolve(res);
    } catch (err) {
      job.reject(err);
    } finally {
      // small delay before processing next to avoid burst
      setTimeout(() => {
        this.active = Math.max(0, this.active - 1);
        this._maybeProcess();
      }, this.delayMs);
    }
  }
}

module.exports = SendQueue;
