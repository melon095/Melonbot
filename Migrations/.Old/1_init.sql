CREATE DATABASE IF NOT EXISTS `twitch` /*!40100 DEFAULT CHARACTER SET latin1 */;
USE `twitch`;

CREATE TABLE IF NOT EXISTS `banphrases` (
  `channel` varchar(255) NOT NULL,
  `Phrase` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`Phrase`)),
  PRIMARY KEY (`channel`),
  KEY `fk_banphrases_channels_idx` (`channel`),
  CONSTRAINT `fk_banphrases_channels` FOREIGN KEY (`channel`) REFERENCES `channels` (`name`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `channels` (
  `name` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `live` tinyint(1) NOT NULL DEFAULT 0,
  `bot_permission` int(11) NOT NULL DEFAULT 1,
  `viewers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`viewers`)),
  `disabled_commands` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`disabled_commands`)),
  `seventv_emote_set` longtext NOT NULL,
  PRIMARY KEY (`name`),
  UNIQUE KEY `user_id_UNIQUE` (`user_id`),
  UNIQUE KEY `name_UNIQUE` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `commands` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `description` text NOT NULL,
  `perm` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `config` (
  `ID` enum('1') NOT NULL,
  `TwitchClientID` varchar(45) NOT NULL,
  `TwitchClientSecret` varchar(45) NOT NULL,
  `TwitchOAuth` varchar(45) NOT NULL,
  `WebUrl` varchar(45) NOT NULL DEFAULT 'http://localhost:3000',
  `BotUsername` varchar(45) NOT NULL DEFAULT 'foobar',
  `OwnerUserID` varchar(11) NOT NULL DEFAULT '00000000',
  `BotUserID` varchar(11) NOT NULL,
  `TwitchAppTokenExpireDate` date DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `error_logs` (
  `error_id` int(11) NOT NULL AUTO_INCREMENT,
  `error_message` text NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`error_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `stats` (
  `name` varchar(255) NOT NULL,
  `commands_handled` int(11) NOT NULL DEFAULT 0,
  `forsen` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`name`),
  KEY `fk_stats_channels_idx` (`name`),
  CONSTRAINT `fk_stats_channels` FOREIGN KEY (`name`) REFERENCES `channels` (`name`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `suggestions` (
  `suggestion_id` int(11) NOT NULL AUTO_INCREMENT,
  `suggestion` text NOT NULL,
  `request_username` text NOT NULL,
  PRIMARY KEY (`suggestion_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `tokens` (
  `id` varchar(11) NOT NULL,
  `access_token` text NOT NULL,
  `name` varchar(255) NOT NULL,
  `refresh_token` text DEFAULT NULL,
  `scope` text NOT NULL,
  `expires_in` date NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_UNIQUE` (`id`),
  KEY `fk_tokens_channels1_idx` (`name`),
  CONSTRAINT `fk_tokens_channels1` FOREIGN KEY (`name`) REFERENCES `channels` (`name`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_tokens_channels2` FOREIGN KEY (`id`) REFERENCES `channels` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `trivia` (
  `channel` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `cooldown` int(255) NOT NULL COMMENT 'Formatted as Milliseconds',
  `filter` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'filter: {\n exclude: string[],\n include: string[]\n}' CHECK (json_valid(`filter`)),
  `leaderboard` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`leaderboard`)),
  PRIMARY KEY (`user_id`),
  KEY `fk_trivia_channels1_idx` (`user_id`),
  CONSTRAINT `fk_trivia_channels1` FOREIGN KEY (`user_id`) REFERENCES `channels` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
