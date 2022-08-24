ALTER TABLE `tokens`
	CHANGE COLUMN `expires_in` `expires_in` INT NOT NULL AFTER `scope`;
