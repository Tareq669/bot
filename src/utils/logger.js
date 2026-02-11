/**
 * Advanced Logging System for Telegram Bot
 * Provides comprehensive logging with file storage and formatted output
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logsDir = path.join(__dirname, '../../logs');
    this.ensureLogsDirectory();
    this.currentLogFile = this.getLogFileName();
  }

  /**
   * Ensure logs directory exists
   */
  ensureLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Get current log file name based on date
   * @returns {string} Log file path
   */
  getLogFileName() {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logsDir, `bot-${date}.log`);
  }

  /**
   * Format log message with timestamp and level
   * @param {string} level - Log level (INFO, WARN, ERROR, etc.)
   * @param {string} message - Log message
   * @param {*} data - Additional data to log
   * @returns {string} Formatted log message
   */
  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level}] ${message}`;

    if (data) {
      if (data instanceof Error) {
        logMessage += `\n${data.stack}`;
      } else if (typeof data === 'object') {
        logMessage += `\n${JSON.stringify(data, null, 2)}`;
      } else {
        logMessage += ` ${data}`;
      }
    }

    return logMessage;
  }

  /**
   * Write log to file
   * @param {string} message - Formatted log message
   */
  writeToFile(message) {
    try {
      // Check if we need to rotate log file (new day)
      const currentFile = this.getLogFileName();
      if (currentFile !== this.currentLogFile) {
        this.currentLogFile = currentFile;
      }

      fs.appendFileSync(this.currentLogFile, `${message  }\n`, 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Log info message
   * @param {string} message - Message to log
   * @param {*} data - Additional data
   */
  info(message, data = null) {
    const formattedMessage = this.formatMessage('INFO', message, data);
    console.log('ℹ️', message, data ? data : '');
    this.writeToFile(formattedMessage);
  }

  /**
   * Log warning message
   * @param {string} message - Message to log
   * @param {*} data - Additional data
   */
  warn(message, data = null) {
    const formattedMessage = this.formatMessage('WARN', message, data);
    console.warn('⚠️', message, data ? data : '');
    this.writeToFile(formattedMessage);
  }

  /**
   * Log error message
   * @param {string} message - Message to log
   * @param {*} error - Error object or additional data
   */
  error(message, error = null) {
    const formattedMessage = this.formatMessage('ERROR', message, error);
    console.error('❌', message, error ? error : '');
    this.writeToFile(formattedMessage);
  }

  /**
   * Log debug message (only in development)
   * @param {string} message - Message to log
   * @param {*} data - Additional data
   */
  debug(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
      const formattedMessage = this.formatMessage('DEBUG', message, data);
      console.debug('🐛', message, data ? data : '');
      this.writeToFile(formattedMessage);
    }
  }

  /**
   * Log success message
   * @param {string} message - Message to log
   * @param {*} data - Additional data
   */
  success(message, data = null) {
    const formattedMessage = this.formatMessage('SUCCESS', message, data);
    console.log('✅', message, data ? data : '');
    this.writeToFile(formattedMessage);
  }

  /**
   * Log user interaction
   * @param {number} userId - User ID
   * @param {string} action - Action performed
   * @param {*} details - Additional details
   */
  logInteraction(userId, action, details = null) {
    const message = `User ${userId} performed: ${action}`;
    this.info(message, details);
  }

  /**
   * Log command execution
   * @param {string} command - Command name
   * @param {number} userId - User ID
   * @param {boolean} success - Whether command succeeded
   */
  logCommand(command, userId, success = true) {
    const message = `Command /${command} executed by user ${userId}`;
    if (success) {
      this.info(message);
    } else {
      this.warn(`${message  } - FAILED`);
    }
  }

  /**
   * Log API call
   * @param {string} api - API name
   * @param {string} method - HTTP method
   * @param {boolean} success - Whether call succeeded
   * @param {number} duration - Duration in ms
   */
  logApiCall(api, method, success, duration = null) {
    const message = `API Call: ${method} ${api}`;
    const data = { success, duration: duration ? `${duration}ms` : 'N/A' };

    if (success) {
      this.info(message, data);
    } else {
      this.error(message, data);
    }
  }

  /**
   * Log database operation
   * @param {string} operation - Operation type (find, create, update, delete)
   * @param {string} model - Model name
   * @param {boolean} success - Whether operation succeeded
   * @param {*} error - Error if failed
   */
  logDatabase(operation, model, success, error = null) {
    const message = `DB ${operation} on ${model}`;

    if (success) {
      this.info(message);
    } else {
      this.error(message, error);
    }
  }

  /**
   * Clean old log files (keep last 7 days)
   */
  cleanOldLogs() {
    try {
      const files = fs.readdirSync(this.logsDir);
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      files.forEach(file => {
        const filePath = path.join(this.logsDir, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          this.info(`Deleted old log file: ${file}`);
        }
      });
    } catch (error) {
      this.error('Failed to clean old logs:', error);
    }
  }

  /**
   * Get log file content
   * @param {string} date - Date in YYYY-MM-DD format (optional)
   * @returns {string|null} Log file content or null if not found
   */
  getLogContent(date = null) {
    try {
      const fileName = date
        ? path.join(this.logsDir, `bot-${date}.log`)
        : this.currentLogFile;

      if (fs.existsSync(fileName)) {
        return fs.readFileSync(fileName, 'utf8');
      }
      return null;
    } catch (error) {
      this.error('Failed to read log file:', error);
      return null;
    }
  }

  /**
   * Get log statistics
   * @returns {Object} Log statistics
   */
  getLogStats() {
    try {
      const content = this.getLogContent();
      if (!content) return null;

      const lines = content.split('\n');
      return {
        totalLines: lines.length,
        errors: lines.filter(l => l.includes('[ERROR]')).length,
        warnings: lines.filter(l => l.includes('[WARN]')).length,
        info: lines.filter(l => l.includes('[INFO]')).length,
        success: lines.filter(l => l.includes('[SUCCESS]')).length
      };
    } catch (error) {
      this.error('Failed to get log stats:', error);
      return null;
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Clean old logs on startup
logger.cleanOldLogs();

module.exports = { logger, Logger };
