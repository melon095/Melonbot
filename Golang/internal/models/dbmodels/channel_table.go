package dbmodels

type BotPermmision int

func (b BotPermmision) String() string {
	switch b {
	case ReadPermission:
		return "Read"
	case WritePermission:
		return "Write"
	case VIPPermission:
		return "VIP"
	case ModeratorPermission:
		return "Moderator"
	case BotPermission:
		return "Bot"
	default:
		return "Unknown"
	}
}

// Returns the message interval cooldown in milliseconds a bot is allowed to send messages to a channel
func (b BotPermmision) ToMessageCooldown() int {
	switch b {
	case ReadPermission, WritePermission:
		return DEFAULT_MESSAGE_INTERVAL
	case VIPPermission:
		return 250
	case ModeratorPermission, BotPermission:
		return 50
	default:
		return DEFAULT_MESSAGE_INTERVAL
	}
}

const (
	// The bot is not allowed to write nor react to messages in the channel
	ReadPermission BotPermmision = 0
	// Default permission levels
	WritePermission BotPermmision = 1
	// Bot is a VIP in the channel
	VIPPermission BotPermmision = 2
	// Bot is a moderator in the channel
	ModeratorPermission BotPermmision = 3
	// The bot's own channel
	BotPermission BotPermmision = 4

	// Default message interval in milliseconds
	DEFAULT_MESSAGE_INTERVAL = 1250
)

type ChannelTable struct {
	Name          string `gorm:"column:name"`
	UserID        string `gorm:"column:user_id"`
	BotPermission int    `gorm:"column:bot_permission"`
}

func (ChannelTable) TableName() string {
	return "bot.channels"
}

func (c *ChannelTable) GetBotPermission() BotPermmision {
	return BotPermmision(c.BotPermission)
}

// Determines if a bot is allowed to speak based on the bot permission level
func (c *ChannelTable) IsAllowedToSpeak() bool {
	return c.GetBotPermission() != ReadPermission
}
