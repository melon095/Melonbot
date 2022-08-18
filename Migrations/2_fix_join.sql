ALTER TABLE `channels`
	CHANGE COLUMN `seventv_emote_set` `seventv_emote_set` LONGTEXT NULL COLLATE 'latin1_swedish_ci' AFTER `disabled_commands`;

ALTER TABLE `stats`
	DROP COLUMN `forsen`;
