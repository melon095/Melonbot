package dbmodels

type BotPermmision int

const (
	ReadPermission      BotPermmision = iota
	WritePermission     BotPermmision = iota
	VIPPermission       BotPermmision = iota
	ModeratorPermission BotPermmision = iota
	BotPermission       BotPermmision = iota
)

type ChannelTable struct {
	Name          string `gorm:"column:name"`
	UserID        string `gorm:"column:user_id"`
	BotPermission int    `gorm:"column:bot_permission"`
}

func (ChannelTable) TableName() string {
	return "bot.channels"
}
