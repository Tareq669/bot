const Markup = require('telegraf/markup');

class UIManager {
  // Check if user is owner
  static isOwner(userId) {
    const ownerIds = (process.env.BOT_OWNERS || '')
      .split(',')
      .map((id) => String(id).trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean)
      .map((id) => parseInt(id, 10))
      .filter((id) => Number.isInteger(id));
    return ownerIds.includes(userId);
  }

  // Owner Reply Keyboard - Ù„Ù„Ù…Ø§Ù„Ùƒ ÙÙ‚Ø·
  static ownerReplyKeyboard() {
    return this.mainReplyKeyboard();
  }

  // Main Menu Keyboard - Reply Keyboard
  static mainReplyKeyboard(userId = null) {
    // Show the full keyboard for all users; owner tools are available via "لوحة المالك" and /owner.

    return Markup.keyboard([
      [
        Markup.button.text('ðŸ•Œ Ø§Ù„Ø®ØªÙ…Ø©'),
        Markup.button.text('ðŸ“¿ Ø§Ù„Ø£Ø°ÙƒØ§Ø±')
      ],
      [
        Markup.button.text('ðŸ“– Ø§Ù„Ù‚Ø±Ø¢Ù†'),
        Markup.button.text('ðŸ’­ Ø§Ù„Ø§Ù‚ØªØ¨Ø§Ø³Ø§Øª')
      ],
      [
        Markup.button.text('âœï¸ Ø§Ù„Ø´Ø¹Ø±'),
        Markup.button.text('ðŸŽ® Ø§Ù„Ø£Ù„Ø¹Ø§Ø¨')
      ],
      [
        Markup.button.text('ðŸ’° Ø§Ù„Ø§Ù‚ØªØµØ§Ø¯'),
        Markup.button.text('ðŸ‘¤ Ø­Ø³Ø§Ø¨ÙŠ')
      ],
      [
        Markup.button.text('ðŸ† Ø§Ù„Ù…ØªØµØ¯Ø±ÙŠÙ†'),
        Markup.button.text('âš™ï¸ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª')
      ],
      [
        Markup.button.text('âœ¨ Ø§Ù„Ù…ÙŠØ²Ø§Øª'),
        Markup.button.text('ðŸ“š Ø§Ù„Ù…ÙƒØªØ¨Ø©')
      ],
      [
        Markup.button.text('ðŸ›ï¸ Ø§Ù„Ù…ØªØ¬Ø±'),
        Markup.button.text('ðŸ’¸ Ø§Ù„ØªØ­ÙˆÙŠÙ„Ø§Øª ÙˆØ§Ù„ØªØ¨Ø±Ø¹Ø§Øª')
      ],
      [
        Markup.button.text('ðŸ”” Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ø°ÙƒÙŠØ©')
      ],
      [
        Markup.button.text('ðŸ“ Ø§Ù„Ù†Ø³Ø® Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠØ©'),
        Markup.button.text('âš¡ Ø§Ù„ØªØ®Ø²ÙŠÙ† Ø§Ù„Ù…Ø¤Ù‚Øª')
      ],
      [
        Markup.button.text('ðŸ›¡ï¸ Ø­Ù…Ø§ÙŠØ© Ù…Ù† Ø§Ù„Ø¥Ø³Ø§Ø¡Ø©'),
        Markup.button.text('ðŸ“Š Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª')
      ],
      [
        Markup.button.text('ðŸŽ¨ ØªÙˆÙ„ÙŠØ¯ ØµÙˆØ±Ø©'),
        Markup.button.text('ðŸŒ¤ï¸ Ø§Ù„Ø·Ù‚Ø³')
      ],
      [Markup.button.text('ðŸ•Œ Ø§Ù„Ø£Ø°Ø§Ù†')],
      [Markup.button.text('👑 لوحة المالك')],
      [
        Markup.button.text('ðŸŽ Ø§Ù„Ù…ÙƒØ§ÙØ¢Øª')
      ],
      [
        Markup.button.text('âŒ Ø¥ØºÙ„Ù‚')
      ]
    ]).resize();
  }

  // Main Menu Keyboard - Smart UI
  static mainMenuKeyboard() {
    return Markup.inlineKeyboard([
      // Ø§Ù„ØµÙ Ø§Ù„Ø£ÙˆÙ„: Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ø¥Ø³Ù„Ø§Ù…ÙŠ
      [
        Markup.button.callback('ðŸ•Œ Ø§Ù„Ø®ØªÙ…Ø©', 'menu:khatma'),
        Markup.button.callback('ðŸ“¿ Ø§Ù„Ø£Ø°ÙƒØ§Ø±', 'menu:adhkar')
      ],
      // Ø§Ù„ØµÙ Ø§Ù„Ø«Ø§Ù†ÙŠ: Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ø«Ù‚Ø§ÙÙŠ
      [
        Markup.button.callback('ðŸ“– Ø§Ù„Ù‚Ø±Ø¢Ù†', 'menu:quran'),
        Markup.button.callback('ðŸ’­ Ø§Ù„Ø§Ù‚ØªØ¨Ø§Ø³Ø§Øª', 'menu:quotes')
      ],
      // Ø§Ù„ØµÙ Ø§Ù„Ø«Ø§Ù„Ø«: Ø§Ù„ØªØ±ÙÙŠÙ‡
      [
        Markup.button.callback('âœï¸ Ø§Ù„Ø´Ø¹Ø±', 'menu:poetry'),
        Markup.button.callback('ðŸŽ® Ø§Ù„Ø£Ù„Ø¹Ø§Ø¨', 'menu:games')
      ],
      // Ø§Ù„ØµÙ Ø§Ù„Ø±Ø§Ø¨Ø¹: Ø§Ù„Ø§Ù‚ØªØµØ§Ø¯ ÙˆØ§Ù„Ù…Ù„Ù
      [
        Markup.button.callback('ðŸ’° Ø§Ù„Ø§Ù‚ØªØµØ§Ø¯', 'menu:economy'),
        Markup.button.callback('ðŸ‘¤ Ø­Ø³Ø§Ø¨ÙŠ', 'menu:profile')
      ],
      // Ø§Ù„ØµÙ Ø§Ù„Ø®Ø§Ù…Ø³: Ø§Ù„Ù…ÙŠØ²Ø§Øª Ø§Ù„Ù…ØªÙ‚Ø¯Ù…Ø©
      [
        Markup.button.callback('âœ¨ Ø§Ù„Ù…ÙŠØ²Ø§Øª', 'menu:features'),
        Markup.button.callback('ðŸ“š Ø§Ù„Ù…ÙƒØªØ¨Ø©', 'menu:library')
      ],
      // Ø§Ù„ØµÙ Ø§Ù„Ø³Ø§Ø¯Ø³: Ø§Ù„Ù…Ø¬ØªÙ…Ø¹
      [
        Markup.button.callback('ðŸ† Ø§Ù„Ù…ØªØµØ¯Ø±ÙŠÙ†', 'menu:leaderboard'),
        Markup.button.callback('âš™ï¸ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª', 'menu:settings')
      ],
      // Ø§Ù„ØµÙ Ø§Ù„Ø³Ø§Ø¨Ø¹: Ø§Ù„Ù…ÙŠØ²Ø§Øª Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©
      [
        Markup.button.callback('ðŸ›ï¸ Ø§Ù„Ù…ØªØ¬Ø±', 'menu:shop'),
        Markup.button.callback('ðŸ’¸ Ø§Ù„ØªØ­ÙˆÙŠÙ„Ø§Øª ÙˆØ§Ù„ØªØ¨Ø±Ø¹Ø§Øª', 'menu:transfers')
      ],
      // Ø§Ù„ØµÙ Ø§Ù„Ø«Ø§Ù…Ù†: Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª
      [
        Markup.button.callback('ðŸ”” Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ø°ÙƒÙŠØ©', 'menu:smartnotifications'),
        Markup.button.callback('ðŸ“ Ø§Ù„Ù†Ø³Ø® Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠØ©', 'menu:backups')
      ],
      // Ø§Ù„ØµÙ Ø§Ù„ØªØ§Ø³Ø¹: Ø§Ù„Ù†Ø³Ø® Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© ÙˆØ§Ù„ØªØ®Ø²ÙŠÙ† Ø§Ù„Ù…Ø¤Ù‚Øª
      [
        Markup.button.callback('âš¡ Ø§Ù„ØªØ®Ø²ÙŠÙ† Ø§Ù„Ù…Ø¤Ù‚Øª', 'menu:cache')
      ],
      // Ø§Ù„ØµÙ Ø§Ù„Ø¹Ø§Ø´Ø±: Ø§Ù„Ø­Ù…Ø§ÙŠØ© ÙˆØ§Ù„Ù…Ù…ÙŠØ²Ø§Øª Ø§Ù„Ø¥Ø¶Ø§ÙÙŠØ©
      [
        Markup.button.callback('ðŸ›¡ï¸ Ø­Ù…Ø§ÙŠØ© Ù…Ù† Ø§Ù„Ø¥Ø³Ø§Ø¡Ø©', 'menu:protection'),
        Markup.button.callback('âœ¨ Ø§Ù„Ù…ÙŠØ²Ø§Øª Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©', 'menu:newfeatures')
      ],
      // Ø§Ù„ØµÙ Ø§Ù„Ø­Ø§Ø¯ÙŠ Ø¹Ø´Ø±: Ø§Ù„Ù…Ù…ÙŠØ²Ø§Øª ÙˆØ§Ù„Ø®ÙŠØ§Ø±Ø§Øª Ø§Ù„Ø¥Ø¶Ø§ÙÙŠØ©
      [
        Markup.button.callback('ðŸ’Ž Ø§Ù„Ù…Ù…ÙŠØ²Ø§Øª', 'menu:premiumfeatures'),
        Markup.button.callback('ðŸ“Š Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª', 'stats:view')
      ],
      // Ø§Ù„ØµÙ Ø§Ù„Ø«Ø§Ù†ÙŠ Ø¹Ø´Ø±: Ø§Ù„Ù…ÙƒØ§ÙØ¢Øª ÙˆØ§Ù„Ø¥ØºÙ„Ø§Ù‚
      [
        Markup.button.callback('ðŸŽ Ø§Ù„Ù…ÙƒØ§ÙØ¢Øª', 'rewards:daily'),
        Markup.button.callback('âŒ Ø¥ØºÙ„Ù‚', 'close')
      ]
    ]);
  }

  // Games Menu
  static gamesMenuKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('ðŸª¨ Ø­Ø¬Ø± ÙˆØ±Ù‚ Ù…Ù‚Øµ', 'game:rps'),
        Markup.button.callback('ðŸ”¢ Ø§Ù„ØªØ®Ù…ÙŠÙ†', 'game:guess')
      ],
      [
        Markup.button.callback('âŒâ­• Ø§ÙƒØ³ Ø§ÙˆÙ‡', 'game:xo'),
        Markup.button.callback('ðŸ€ Ù„Ø¹Ø¨Ø© Ø§Ù„Ø­Ø¸', 'game:luck')
      ],
      [
        Markup.button.callback('ðŸ§  Ø£Ø³Ø¦Ù„Ø© Ø«Ù‚Ø§ÙÙŠØ©', 'game:quiz')
      ],
      [
        Markup.button.callback('ðŸ“– Ø§Ù„Ø£Ù„Ø¹Ø§Ø¨ Ø§Ù„Ù‚Ø±Ø¢Ù†ÙŠØ©', 'game:quranic'),
        Markup.button.callback('ðŸŽ² Ø±ÙˆÙ„ Ø§Ù„Ù†Ø±Ø¯', 'game:dice')
      ],
      [
        Markup.button.callback('\ud83d\udca3 \u062a\u0641\u0643\u064a\u0643 \u0627\u0644\u0642\u0646\u0628\u0644\u0629', 'game:bomb'),
        Markup.button.callback('\ud83c\udccf \u0645\u0639\u0631\u0643\u0629 \u0627\u0644\u0628\u0637\u0627\u0642\u0627\u062a', 'game:cardbattle')
      ],
      [
        Markup.button.callback('\ud83e\udde0 \u0623\u0644\u063a\u0627\u0632 \u0627\u0644\u0630\u0643\u0627\u0621', 'game:mind'),
        Markup.button.callback('\ud83c\udfaf \u062a\u062d\u062f\u064a\u0627\u062a \u0639\u0634\u0648\u0627\u0626\u064a\u0629', 'game:challenges')
      ],
      [
        Markup.button.callback('\u2b05\ufe0f \u0631\u062c\u0648\u0639', 'menu:main')
      ]
    ]);
  }

  // Economy Menu
  static economyMenuKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('ðŸ’° Ø§Ù„Ø±ØµÙŠØ¯', 'eco:balance'),
        Markup.button.callback('ðŸ’¸ ØªØ­ÙˆÙŠÙ„', 'eco:transfer')
      ],
      [
        Markup.button.callback('ðŸª Ø§Ù„Ù…ØªØ¬Ø±', 'eco:shop'),
        Markup.button.callback('ðŸ“¦ Ø§Ù„Ø­Ù‚ÙŠØ¨Ø©', 'eco:inventory')
      ],
      [
        Markup.button.callback('ðŸ’Ž Ø§Ù„Ù…Ø²Ø§Ø¯', 'eco:auction'),
        Markup.button.callback('ðŸ“Š Ø§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª', 'eco:stats')
      ],
      [
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'menu:main')
      ]
    ]);
  }

  // Profile Menu
  static profileMenuKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('ðŸ“ˆ Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª', 'profile:info'),
        Markup.button.callback('ðŸ… Ø§Ù„Ø´Ø§Ø±Ø§Øª', 'profile:badges')
      ],
      [
        Markup.button.callback('ðŸŽ® Ø§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª', 'profile:stats'),
        Markup.button.callback('ðŸŽ Ø§Ù„Ù‡Ø¯Ø§ÙŠØ§', 'profile:gifts')
      ],
      [
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'menu:main')
      ]
    ]);
  }

  // Settings Menu (Admin only)
  static settingsMenuKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('ðŸ”§ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø¹Ø§Ù…Ø©', 'settings:general'),
        Markup.button.callback('ðŸ‘¥ Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†', 'settings:users')
      ],
      [
        Markup.button.callback('ðŸ“ Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø­ØªÙˆÙ‰', 'settings:content'),
        Markup.button.callback('ðŸ›¡ï¸ Ø§Ù„Ø£Ù…Ø§Ù†', 'settings:security')
      ],
      [
        Markup.button.callback('ðŸ“Š Ø§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª', 'settings:stats'),
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'menu:main')
      ]
    ]);
  }

  static userSettingsKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('ðŸ•Œ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø®ØªÙ…Ø©', 'khatma:settings')
      ],
      [
        Markup.button.callback('ðŸ”” Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª', 'settings:notifications')
      ],
      [
        Markup.button.callback('ðŸ‘¤ Ø§Ù„Ù…Ù„Ù Ø§Ù„Ø´Ø®ØµÙŠ', 'menu:profile'),
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'menu:main')
      ]
    ]);
  }

  // Pagination Keyboard
  static paginationKeyboard(page, totalPages, baseCallback) {
    const buttons = [];

    if (page > 1) {
      buttons.push(Markup.button.callback('â¬…ï¸ Ø§Ù„Ø³Ø§Ø¨Ù‚', `${baseCallback}:${page - 1}`));
    }

    buttons.push(Markup.button.callback(`${page}/${totalPages}`, 'noop'));

    if (page < totalPages) {
      buttons.push(Markup.button.callback('Ø§Ù„ØªØ§Ù„ÙŠ âž¡ï¸', `${baseCallback}:${page + 1}`));
    }

    return Markup.inlineKeyboard([buttons]);
  }

  // Confirmation Keyboard
  static confirmationKeyboard(yesCallback, noCallback) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('âœ… Ù†Ø¹Ù…', yesCallback),
        Markup.button.callback('âŒ Ù„Ø§', noCallback)
      ]
    ]);
  }

  // Close Button
  static closeButton() {
    return Markup.inlineKeyboard([
      [Markup.button.callback('âŒ Ø¥ØºÙ„Ø§Ù‚', 'close')]
    ]);
  }

  // Back Button
  static backButton(backCallback = 'menu:main') {
    return Markup.inlineKeyboard([
      [Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', backCallback)]
    ]);
  }

  // Owner Control Panel - Ù„ÙˆØ­Ø© ØªØ­ÙƒÙ… Ø§Ù„Ù…Ø§Ù„Ùƒ
  static ownerControlPanel() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('ðŸ“Š Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª Ø§Ù„Ø¨ÙˆØª', 'owner:stats'),
        Markup.button.callback('ðŸ‘¥ ÙƒÙ„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†', 'owner:users')
      ],
      [
        Markup.button.callback('ðŸ“¢ Ø¨Ø« Ø±Ø³Ø§Ù„Ø©', 'owner:broadcast'),
        Markup.button.callback('ðŸ—‘ï¸ Ø­Ø°Ù Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª', 'owner:cleanup')
      ],
      [
        Markup.button.callback('ðŸš« Ø§Ù„Ù…Ø­Ø¸ÙˆØ±ÙˆÙ†', 'owner:banned'),
        Markup.button.callback('ðŸ’° Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø§Ù‚ØªØµØ§Ø¯', 'owner:economy')
      ],
      [
        Markup.button.callback('ðŸ“ Ø§Ù„Ø³Ø¬Ù„Ø§Øª', 'owner:logs'),
        Markup.button.callback('ðŸ”§ Ø§Ù„ØµÙŠØ§Ù†Ø©', 'owner:maintenance')
      ],
      [
        Markup.button.callback('ðŸ—„ï¸ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª', 'owner:database'),
        Markup.button.callback('âš¡ Ø§Ù„Ø£Ù†Ø¸Ù…Ø©', 'owner:systems')
      ],
      [
        Markup.button.callback('ðŸŽ® Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø£Ù„Ø¹Ø§Ø¨', 'owner:games'),
        Markup.button.callback('ðŸ“š Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø­ØªÙˆÙ‰', 'owner:content')
      ],
      [
        Markup.button.callback('ðŸ”„ Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„ØªØ´ØºÙŠÙ„', 'owner:restart'),
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'menu:main')
      ]
    ]);
  }

  // Owner Users Management
  static ownerUsersManagement() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('ðŸ‘ï¸ Ø¹Ø±Ø¶ Ø§Ù„ÙƒÙ„', 'owner:viewall'),
        Markup.button.callback('ðŸ” Ø¨Ø­Ø«', 'owner:search')
      ],
      [
        Markup.button.callback('ðŸš« Ø­Ø¸Ø± Ù…Ø³ØªØ®Ø¯Ù…', 'owner:ban'),
        Markup.button.callback('âœ… Ø¥Ù„ØºØ§Ø¡ Ø­Ø¸Ø±', 'owner:unban')
      ],
      [
        Markup.button.callback('ðŸ’Ž Ø¥Ø¹Ø·Ø§Ø¡ Ø¹Ù…Ù„Ø§Øª', 'owner:givecoins'),
        Markup.button.callback('â­ Ø¥Ø¹Ø·Ø§Ø¡ XP', 'owner:givexp')
      ],
      [
        Markup.button.callback('ðŸ”„ Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ†', 'owner:reset'),
        Markup.button.callback('ðŸ—‘ï¸ Ø­Ø°Ù Ù…Ø³ØªØ®Ø¯Ù…', 'owner:delete')
      ],
      [
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'owner:panel')
      ]
    ]);
  }

  // Owner Economy Management
  static ownerEconomyManagement() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('ðŸ’° Ø£ØºÙ†Ù‰ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†', 'owner:richest'),
        Markup.button.callback('ðŸ“Š Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª', 'owner:ecostats')
      ],
      [
        Markup.button.callback('ðŸŽ Ù…ÙƒØ§ÙØ£Ø© Ù„Ù„Ø¬Ù…ÙŠØ¹', 'owner:rewardall'),
        Markup.button.callback('ðŸ’¸ Ø®ØµÙ… Ù…Ù† Ø§Ù„ÙƒÙ„', 'owner:taxall')
      ],
      [
        Markup.button.callback('ðŸ›’ Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…ØªØ¬Ø±', 'owner:shop'),
        Markup.button.callback('ðŸ“¦ Ø§Ù„Ø¹Ù†Ø§ØµØ±', 'owner:items')
      ],
      [
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'owner:panel')
      ]
    ]);
  }

  // Owner Database Management
  static ownerDatabaseManagement() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('ðŸ“Š Ù…Ø¹Ù„ÙˆÙ…Ø§Øª DB', 'owner:dbinfo'),
        Markup.button.callback('ðŸ’¾ Ù†Ø³Ø® Ø§Ø­ØªÙŠØ§Ø·ÙŠ', 'owner:backup')
      ],
      [
        Markup.button.callback('ðŸ”„ Ø§Ø³ØªØ±Ø¬Ø§Ø¹', 'owner:restore'),
        Markup.button.callback('ðŸ—‘ï¸ ØªÙ†Ø¸ÙŠÙ', 'owner:dbclean')
      ],
      [
        Markup.button.callback('âš¡ Ø§Ù„Ø£Ø¯Ø§Ø¡', 'owner:performance'),
        Markup.button.callback('ðŸ” Ø§Ø³ØªØ¹Ù„Ø§Ù…', 'owner:query')
      ],
      [
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'owner:panel')
      ]
    ]);
  }

  // ==================== NEW FEATURES KEYBOARDS ====================

  // Advanced Features Menu
  static advancedFeaturesKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('ðŸŽ¯ Ø§Ù„Ø£Ù‡Ø¯Ø§Ù', 'features:goals'),
        Markup.button.callback('ðŸ’ Ø§Ù„ØµØ¯Ù‚Ø§Øª', 'features:charity')
      ],
      [
        Markup.button.callback('ðŸ“– Ø§Ù„Ø­ÙØ¸', 'features:memorization'),
        Markup.button.callback('ðŸ¤² Ø§Ù„Ø£Ø¯Ø¹ÙŠØ©', 'features:dua')
      ],
      [
        Markup.button.callback('ðŸ“¢ Ø§Ù„Ø¥Ø­Ø§Ù„Ø§Øª', 'features:referral'),
        Markup.button.callback('ðŸ† Ø§Ù„Ø£Ø­Ø¯Ø§Ø«', 'features:events')
      ],
      [
        Markup.button.callback('ðŸŽ Ø§Ù„Ù…ÙƒØ§ÙØ¢Øª', 'features:rewards'),
        Markup.button.callback('ðŸ“š Ø§Ù„Ù…ÙƒØªØ¨Ø©', 'features:library')
      ],
      [
        Markup.button.callback('ðŸ‘¥ Ø§Ù„ÙØ±Ù‚', 'features:teams'),
        Markup.button.callback('ðŸ“Š Ø§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª', 'features:stats')
      ],
      [
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'menu:main')
      ]
    ]);
  }

  // Islamic Content Keyboard
  static islamicContentKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('ðŸ“– ØªÙØ³ÙŠØ±', 'library:tafsir'),
        Markup.button.callback('ðŸ“¿ Ø£Ø­Ø§Ø¯ÙŠØ«', 'library:hadith')
      ],
      [
        Markup.button.callback('ðŸ“š ÙÙ‚Ù‡', 'library:fiqh'),
        Markup.button.callback('ðŸ“• Ù‚ØµØµ Ù‚Ø±Ø¢Ù†ÙŠØ©', 'library:stories')
      ],
      [
        Markup.button.callback('ðŸ‘¤ Ø§Ù„ØµØ­Ø§Ø¨Ø©', 'library:sahabi'),
        Markup.button.callback('ðŸ¤² Ø£ÙˆØ±Ø§Ø¯', 'library:awrad')
      ],
      [
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'menu:main')
      ]
    ]);
  }

  // Charity Types Keyboard
  static charityTypesKeyboard() {
    const CharityTracker = require('../features/charityTracker');
    const types = CharityTracker.getCharityTypes();

    const buttons = types.map(t =>
      Markup.button.callback(`${t.emoji} ${t.type}`, `charity:add:${t.type}`)
    );

    // Split buttons into rows of 2
    const keyboard = [];
    for (let i = 0; i < buttons.length; i += 2) {
      keyboard.push(buttons.slice(i, i + 2));
    }
    keyboard.push([Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'menu:main')]);

    return Markup.inlineKeyboard(keyboard);
  }

  // Rewards Buttons
  static rewardsButtonsKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('ðŸŽ ÙŠÙˆÙ…ÙŠØ©', 'reward:daily'),
        Markup.button.callback('ðŸŽ° Ø§Ù„Ø¹Ø¬Ù„Ø©', 'reward:wheel')
      ],
      [
        Markup.button.callback('ðŸ“¦ Ø¨Ø³ÙŠØ·', 'reward:loot:basic'),
        Markup.button.callback('ðŸŽ ÙØ¶ÙŠ', 'reward:loot:silver')
      ],
      [
        Markup.button.callback('ðŸ’Ž Ø°Ù‡Ø¨ÙŠ', 'reward:loot:gold'),
        Markup.button.callback('ðŸ‘‘ Ø£Ø³Ø·ÙˆØ±ÙŠ', 'reward:loot:legendary')
      ],
      [
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'menu:main')
      ]
    ]);
  }

  // Dua Collections Keyboard
  static duaCollectionsKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('ðŸŒ… Ø§Ù„ØµØ¨Ø§Ø­', 'dua:morning'),
        Markup.button.callback('ðŸŒ™ Ø§Ù„Ù…Ø³Ø§Ø¡', 'dua:evening')
      ],
      [
        Markup.button.callback('ðŸ›¡ï¸ Ø­Ù…Ø§ÙŠØ©', 'dua:protection'),
        Markup.button.callback('ðŸ¤² Ù…ØºÙØ±Ø©', 'dua:forgiveness')
      ],
      [
        Markup.button.callback('ðŸ’° Ø±Ø²Ù‚', 'dua:sustenance'),
        Markup.button.callback('ðŸ˜´ Ù†ÙˆÙ…', 'dua:sleep')
      ],
      [
        Markup.button.callback('ðŸ½ï¸ Ø·Ø¹Ø§Ù…', 'dua:food'),
        Markup.button.callback('âœˆï¸ Ø³ÙØ±', 'dua:travel')
      ],
      [
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'menu:main')
      ]
    ]);
  }

  // Goals Templates Keyboard
  static goalsTemplatesKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('ðŸ“– Ø®ØªÙ…Ø©', 'goal:khatma'),
        Markup.button.callback('ðŸ“¿ Ø£Ø°ÙƒØ§Ø± ÙŠÙˆÙ…ÙŠØ©', 'goal:adhkar')
      ],
      [
        Markup.button.callback('ðŸ“„ ØµÙØ­Ø§Øª Ù‚Ø±Ø¢Ù†', 'goal:pages'),
        Markup.button.callback('ðŸ¤² ØµÙ„ÙˆØ§Øª', 'goal:prayers')
      ],
      [
        Markup.button.callback('ðŸŽ® Ø£Ù„Ø¹Ø§Ø¨', 'goal:games'),
        Markup.button.callback('ðŸ’ ØµØ¯Ù‚Ø§Øª', 'goal:charity')
      ],
      [
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'menu:main')
      ]
    ]);
  }

  // Memorization Actions Keyboard
  static memorizationActionsKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('âž• Ø¥Ø¶Ø§ÙØ© Ø¢ÙŠØ§Øª', 'mem:add'),
        Markup.button.callback('ðŸ“ Ù…Ø±Ø§Ø¬Ø¹Ø©', 'mem:review')
      ],
      [
        Markup.button.callback('ðŸ“Š Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª', 'mem:stats'),
        Markup.button.callback('ðŸ’¡ Ù†ØµØ§Ø¦Ø­', 'mem:tips')
      ],
      [
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'menu:main')
      ]
    ]);
  }

  // Teams Management Keyboard
  static teamsManagementKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('âž• Ø¥Ù†Ø´Ø§Ø¡ ÙØ±ÙŠÙ‚', 'team:create'),
        Markup.button.callback('ðŸ‘¥ Ø§Ù„Ø§Ù†Ø¶Ù…Ø§Ù…', 'team:join')
      ],
      [
        Markup.button.callback('ðŸ“Š Ù„ÙˆØ­Ø© Ø§Ù„Ù…ØªØµØ¯Ø±ÙŠÙ†', 'team:leaderboard'),
        Markup.button.callback('â„¹ï¸ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª ÙØ±ÙŠÙ‚ÙŠ', 'team:info')
      ],
      [
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'menu:main')
      ]
    ]);
  }

  // ==================== Ø¬Ø¯ÙŠØ¯: Ø§Ù„Ù…Ù…ÙŠØ²Ø§Øª Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø© ====================

  // New Features Menu - Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ù…ÙŠØ²Ø§Øª Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©
  static newFeaturesMenuKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('ðŸŽ® Ø§Ù„Ø£Ù„Ø¹Ø§Ø¨ Ø§Ù„Ù‚Ø±Ø¢Ù†ÙŠØ©', 'new:qgames'),
        Markup.button.callback('ðŸ›ï¸ Ø§Ù„Ù…ØªØ¬Ø±', 'new:shop')
      ],
      [
        Markup.button.callback('ðŸ’¸ Ø§Ù„ØªØ­ÙˆÙŠÙ„Ø§Øª Ø§Ù„Ù…Ø§Ù„ÙŠØ©', 'new:transfer'),
        Markup.button.callback('ðŸ’ Ø§Ù„ØªØ¨Ø±Ø¹Ø§Øª', 'new:donate')
      ],
      [
        Markup.button.callback('ðŸ”” Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ø°ÙƒÙŠØ©', 'new:notifications'),
        Markup.button.callback('ðŸŒ Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù„ØºØ§Øª', 'new:language')
      ],
      [
        Markup.button.callback('ðŸ“ Ø§Ù„Ù†Ø³Ø® Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠØ©', 'new:backup'),
        Markup.button.callback('âš¡ Ù†Ø¸Ø§Ù… Ø§Ù„ØªØ®Ø²ÙŠÙ† Ø§Ù„Ù…Ø¤Ù‚Øª', 'new:cache')
      ],
      [
        Markup.button.callback('ðŸ›¡ï¸ Ø­Ù…Ø§ÙŠØ© Ù…Ù† Ø§Ù„Ø¥Ø³Ø§Ø¡Ø©', 'new:ratelimiter'),
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'menu:main')
      ]
    ]);
  }

  // Quranic Games Keyboard
  static quranicGamesKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('1ï¸âƒ£ ØªØ®Ù…ÙŠÙ† Ø§Ù„Ø¢ÙŠØ©', 'qgame:gueverse'),
        Markup.button.callback('2ï¸âƒ£ Ø¥ÙƒÙ…Ø§Ù„ Ø§Ù„Ø¢ÙŠØ©', 'qgame:complete')
      ],
      [
        Markup.button.callback('3ï¸âƒ£ Ø§ÙƒØªØ´Ù Ø§Ù„ÙØ±Ù‚', 'qgame:spot'),
        Markup.button.callback('4ï¸âƒ£ Ø«Ù„Ø§Ø«ÙŠØ§Øª Ù‚Ø±Ø¢Ù†ÙŠØ©', 'qgame:trivia')
      ],
      [
        Markup.button.callback('5ï¸âƒ£ Ø¹Ø¯ Ø§Ù„Ø³ÙˆØ±', 'qgame:surah'),
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'new:qgames')
      ]
    ]);
  }

  // Shop Menu - Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…ØªØ¬Ø±
  static shopMenuKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('ðŸ‘‘ Ø§Ù„Ø£ÙˆØ³Ù…Ø©', 'shop:badges'),
        Markup.button.callback('âš¡ Ø§Ù„Ù…Ø¹Ø²Ø²Ø§Øª', 'shop:boosts')
      ],
      [
        Markup.button.callback('ðŸŽ Ø§Ù„Ø¬ÙˆØ§Ø¦Ø²', 'shop:rewards'),
        Markup.button.callback('ðŸŽ® Ø£Ø¯ÙˆØ§Øª Ø§Ù„Ø£Ù„Ø¹Ø§Ø¨', 'shop:weapons')
      ],
      [
        Markup.button.callback('ðŸ“‹ Ø§Ù„ÙƒÙ„', 'shop:all'),
        Markup.button.callback('ðŸ›’ Ø­Ù‚ÙŠØ¨ØªÙŠ', 'shop:inventory')
      ],
      [
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'new:shop')
      ]
    ]);
  }

  // Transfer & Donate Menu
  static transferMenuKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('ðŸ’¸ ØªØ­ÙˆÙŠÙ„ Ø¹Ù…Ù„Ø§Øª', 'transfer:coins'),
        Markup.button.callback('â­ ØªØ­ÙˆÙŠÙ„ Ù†Ù‚Ø§Ø·', 'transfer:points')
      ],
      [
        Markup.button.callback('ðŸ’ ØªØ¨Ø±Ø¹ Ø®ÙŠØ±ÙŠ', 'transfer:charity'),
        Markup.button.callback('ðŸ“Š Ø§Ù„Ø³Ø¬Ù„', 'transfer:history')
      ],
      [
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'new:transfer')
      ]
    ]);
  }


  // Keyboard for specific notification type menu
  static notificationTypeMenuKeyboard(type) {
    const typeNames = {
      'adhkar': 'Ø§Ù„Ø£Ø°ÙƒØ§Ø± ðŸ•Œ',
      'prayer': 'Ø§Ù„ØµÙ„Ø§Ø© â°',
      'games': 'Ø§Ù„Ø£Ù„Ø¹Ø§Ø¨ ðŸŽ®',
      'rewards': 'Ø§Ù„Ù…ÙƒØ§ÙØ¢Øª ðŸ’°',
      'events': 'Ø§Ù„Ø£Ø­Ø¯Ø§Ø« ðŸ””',
      'stats': 'Ø§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª ðŸ“Š',
      'auction': 'Ø§Ù„Ù…Ø²Ø§Ø¯ ðŸ·ï¸'
    };

    return Markup.inlineKeyboard([
      [
        Markup.button.callback(`ðŸ”” ØªÙØ¹ÙŠÙ„ Ø¥Ø´Ø¹Ø§Ø±Ø§Øª ${typeNames[type]}`, `notify:toggle:${type}:true`)
      ],
      [
        Markup.button.callback(`ðŸ”• ØªØ¹Ø·ÙŠÙ„ Ø¥Ø´Ø¹Ø§Ø±Ø§Øª ${typeNames[type]}`, `notify:toggle:${type}:false`)
      ],
      [
        Markup.button.callback('âš™ï¸ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„ÙˆÙ‚Øª', `notify:time:${type}`)
      ],
      [
        Markup.button.callback('ðŸ”™ Ø±Ø¬ÙˆØ¹', 'notify:main')
      ]
    ]);
  }

  // Keyboard for toggling a specific notification type
  // (Removed duplicate notificationToggleKeyboard)


  static notificationsMenuKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('ðŸ•Œ Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ø£Ø°ÙƒØ§Ø±', 'notify:adhkar'),
        Markup.button.callback('â° Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„ØµÙ„Ø§Ø©', 'notify:prayer')
      ],
      [
        Markup.button.callback('ðŸŽ® Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ø£Ù„Ø¹Ø§Ø¨', 'notify:games'),
        Markup.button.callback('ðŸ’° Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ù…ÙƒØ§ÙØ¢Øª', 'notify:rewards')
      ],
      [
        Markup.button.callback('ðŸ”” Ø§Ù†ØªØ¨Ù‡ Ù„Ù„Ø­Ø¯Ø«', 'notify:events'),
        Markup.button.callback('ðŸ“Š Ø¥Ø­ØµØ§Ø¦ÙŠØ§ØªÙŠ', 'notify:stats')
      ],
      [
        Markup.button.callback('ðŸ·ï¸ Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ù…Ø²Ø§Ø¯', 'notify:auction')
      ],
      [
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'new:notifications')
      ]
    ]);
  }

  // Keyboard for toggling a specific notification type
  static notificationToggleKeyboard(type, enabled) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(
          enabled ? 'âŒ ØªØ¹Ø·ÙŠÙ„ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª' : 'âœ… ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª',
          `toggleNotify:${type}`
        )
      ],
      [
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'new:notifications')
      ]
    ]);
  }

  // Backup System Menu
  static backupMenuKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('ðŸ’¾ Ø¥Ù†Ø´Ø§Ø¡ Ù†Ø³Ø®Ø© Ø§Ø­ØªÙŠØ§Ø·ÙŠØ©', 'backup:create'),
        Markup.button.callback('ðŸ“‹ Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù†Ø³Ø®', 'backup:list')
      ],
      [
        Markup.button.callback('ðŸ”„ Ø§Ø³ØªØ¹Ø§Ø¯Ø©', 'backup:restore'),
        Markup.button.callback('ðŸ—‘ï¸ Ø­Ø°Ù Ù†Ø³Ø®Ø©', 'backup:delete')
      ],
      [
        Markup.button.callback('ðŸ“Š Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª', 'backup:stats'),
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'new:backup')
      ]
    ]);
  }

  // Cache System Info
  static cacheSystemKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('ðŸ“Š Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª Ø§Ù„Ø°Ø§ÙƒØ±Ø©', 'cache:stats'),
        Markup.button.callback('ðŸ§¹ Ù…Ø³Ø­ Ø§Ù„Ø°Ø§ÙƒØ±Ø©', 'cache:clear')
      ],
      [
        Markup.button.callback('âš¡ Ø§Ù„Ø£Ø¯Ø§Ø¡', 'cache:performance'),
        Markup.button.callback('â“ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª', 'cache:info')
      ],
      [
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'new:cache')
      ]
    ]);
  }

  // Rate Limiter Protection Info
  static rateLimiterKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('ðŸ“Š Ø­Ø§Ù„ØªÙŠ', 'ratelimit:status'),
        Markup.button.callback('â“ Ù…Ø§ Ù‡Ø°Ø§ØŸ', 'ratelimit:info')
      ],
      [
        Markup.button.callback('ðŸ›¡ï¸ Ù…Ø³ØªÙˆÙŠØ§Øª Ø§Ù„Ø­Ù…Ø§ÙŠØ©', 'ratelimit:levels'),
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'new:ratelimiter')
      ]
    ]);
  }

  // Premium Features Menu
  static premiumFeaturesKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('ðŸ’Ž Ø§Ù„Ù…ÙŠØ²Ø§Øª Ø§Ù„Ù…Ù…ÙŠØ²Ø©', 'premium:features'),
        Markup.button.callback('ðŸ’° Ø§Ù„Ø£Ø³Ø¹Ø§Ø±', 'premium:pricing')
      ],
      [
        Markup.button.callback('ðŸŽ Ø§Ù„Ø¹Ø±ÙˆØ¶ Ø§Ù„Ø®Ø§ØµØ©', 'premium:offers'),
        Markup.button.callback('ðŸ“Š Ø§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª', 'premium:stats')
      ],
      [
        Markup.button.callback('ðŸ’³ Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ', 'premium:subscribe'),
        Markup.button.callback('â¬…ï¸ Ø±Ø¬ÙˆØ¹', 'menu:main')
      ]
    ]);
  }
}

module.exports = UIManager;

