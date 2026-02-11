/**
 * Game Handlers
 * Handles all game-related actions and commands
 */

const { logger } = require('../utils/logger');
const GameHandler = require('../commands/gameHandler');

class GameHandlers {
  /**
   * Register all game handlers with the bot
   * @param {Telegraf} bot - Telegraf bot instance
   */
  static register(bot) {
    // Regular games
    bot.action('game:rps', GameHandlers.handleRPS);
    bot.action(/game:rps:(rock|paper|scissors)/, GameHandlers.handleRPSChoice);
    bot.action('game:guess', GameHandlers.handleGuess);
    bot.action('game:quiz', GameHandlers.handleQuiz);
    bot.action(/game:quiz:(.+)/, GameHandlers.handleQuizAnswer);
    bot.action('game:dice', GameHandlers.handleDice);
    bot.action('game:luck', GameHandlers.handleLuck);
    bot.action('game:challenges', GameHandlers.handleChallenges);

    // Quranic games
    bot.action(/qgame:(gueverse|complete|spot|trivia|surah)/, GameHandlers.handleQuranicGame);

    logger.info('Game handlers registered successfully');
  }

  /**
   * Handle Rock Paper Scissors game
   */
  static async handleRPS(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'game_rps_start');
      await GameHandler.handleRPS(ctx);
    } catch (error) {
      logger.error('RPS game error:', error);
      ctx.reply('❌ حدث خطأ في اللعبة');
    }
  }

  /**
   * Handle Rock Paper Scissors choice
   */
  static async handleRPSChoice(ctx) {
    try {
      const choice = ctx.match[1];
      logger.logInteraction(ctx.from.id, 'game_rps_choice', { choice });
      await GameHandler.handleRPSChoice(ctx, choice);
    } catch (error) {
      logger.error('RPS choice error:', error);
      ctx.reply('❌ حدث خطأ في اللعبة');
    }
  }

  /**
   * Handle Guess game
   */
  static async handleGuess(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'game_guess_start');
      await GameHandler.handleGuess(ctx);
    } catch (error) {
      logger.error('Guess game error:', error);
      ctx.reply('❌ حدث خطأ في اللعبة');
    }
  }

  /**
   * Handle Quiz game
   */
  static async handleQuiz(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'game_quiz_start');
      await GameHandler.handleQuiz(ctx);
    } catch (error) {
      logger.error('Quiz game error:', error);
      ctx.reply('❌ حدث خطأ في اللعبة');
    }
  }

  /**
   * Handle Quiz answer
   */
  static async handleQuizAnswer(ctx) {
    try {
      const answer = ctx.match[1];
      logger.logInteraction(ctx.from.id, 'game_quiz_answer', { answer });
      await GameHandler.handleQuizAnswer(ctx, answer);
    } catch (error) {
      logger.error('Quiz answer error:', error);
      ctx.reply('❌ حدث خطأ في اللعبة');
    }
  }

  /**
   * Handle Dice game
   */
  static async handleDice(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'game_dice');
      await GameHandler.handleDice(ctx);
    } catch (error) {
      logger.error('Dice game error:', error);
      ctx.reply('❌ حدث خطأ في اللعبة');
    }
  }

  /**
   * Handle Luck game
   */
  static async handleLuck(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'game_luck');
      await GameHandler.handleLuck(ctx);
    } catch (error) {
      logger.error('Luck game error:', error);
      ctx.reply('❌ حدث خطأ في اللعبة');
    }
  }

  /**
   * Handle Challenges
   */
  static async handleChallenges(ctx) {
    try {
      logger.logInteraction(ctx.from.id, 'game_challenges');
      await GameHandler.handleChallenges(ctx);
    } catch (error) {
      logger.error('Challenges error:', error);
      ctx.reply('❌ حدث خطأ في اللعبة');
    }
  }

  /**
   * Handle Quranic games
   */
  static async handleQuranicGame(ctx) {
    try {
      const gameType = ctx.match[1];
      logger.logInteraction(ctx.from.id, 'quranic_game', { gameType });

      const QuranicGames = require('../games/quranicGames');

      switch (gameType) {
        case 'gueverse':
          await QuranicGames.startGuessVerseGame(ctx);
          break;
        case 'complete':
          await QuranicGames.startCompleteVerseGame(ctx);
          break;
        case 'spot':
          await QuranicGames.startSpotErrorGame(ctx);
          break;
        case 'trivia':
          await QuranicGames.startTriviaGame(ctx);
          break;
        case 'surah':
          await QuranicGames.startSurahGame(ctx);
          break;
        default:
          await ctx.reply('❌ لعبة غير معروفة');
      }
    } catch (error) {
      logger.error('Quranic game error:', error);
      ctx.reply('❌ حدث خطأ في اللعبة القرآنية');
    }
  }
}

module.exports = GameHandlers;
