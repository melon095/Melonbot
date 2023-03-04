import { EPermissionLevel } from './../Typings/enums.js';
import gql, { UserEditorPermissions } from '../SevenTVGQL.js';
import SevenTVAllowed, { Get7TVUserMod } from './../PreHandlers/7tv.can.modify.js';
import PreHandlers from './../PreHandlers/index.js';
import { registerCommand } from '../controller/Commands/Handler.js';

type PreHandlers = {
	SevenTV: Get7TVUserMod;
};

const isAlreadyEditor = async (owner: string, editor: string) => {
	return Bot.Redis.SetMembers(`seventv:${owner}:editors`).then((editors) =>
		editors.includes(editor),
	);
};

registerCommand<PreHandlers>({
	Name: 'editor',
	Ping: true,
	Description: 'Allows the bot to add and remove users as 7TV editors',
	Permission: EPermissionLevel.BROADCAST,
	OnlyOffline: false,
	Aliases: ['adde', 'addeditor', 'removee', 'removeeditor'],
	Cooldown: 5,
	Params: [],
	Flags: [],
	PreHandlers: [SevenTVAllowed],
	Code: async function (ctx, mods) {
		const { EmoteSet, UserID } = mods.SevenTV;

		let internalUser;

		const name = ctx.input[0];
		if (!name) {
			return {
				Success: false,
				Result: 'Please provide a username :(',
			};
		}

		try {
			const userName = Bot.User.CleanName(ctx.input[0]);
			internalUser = await Bot.User.ResolveUsername(userName);
		} catch (error) {
			return {
				Success: false,
				Result: 'Unable to find that user',
			};
		}

		const user = await gql.GetUser(internalUser).catch(() => null);
		if (!user)
			return {
				Success: false,
				Result: 'User not found',
			};

		const resultPrompt = (type: 'Added' | 'Removed', name: string) =>
			`${type} ${name} as an editor :)`;

		const errorPrompt = (err: string) => {
			if (err.startsWith('70403')) {
				return "I don't have permission to set editors";
			} else {
				ctx.Log('info', '7TV - Failed to add editor', err);
				return err;
			}
		};

		const isEditor = await isAlreadyEditor(UserID(), internalUser.Name);
		if (isEditor) {
			if (internalUser.Name === Bot.Config.BotUsername) {
				return {
					Success: false,
					Result: 'FailFish',
				};
			}

			try {
				await gql.ModifyUserEditorPermissions(
					UserID(),
					user.id,
					UserEditorPermissions.NONE,
				);
			} catch (error) {
				return {
					Success: false,
					Result: errorPrompt(String(error)),
				};
			}
			await Bot.Redis.SetRemove(`seventv:${EmoteSet()}:editors`, [internalUser.Name]);

			return {
				Success: true,
				Result: resultPrompt('Removed', user.username),
			};
		} else {
			try {
				await gql.ModifyUserEditorPermissions(
					UserID(),
					user.id,
					UserEditorPermissions.DEFAULT,
				);
			} catch (error) {
				return {
					Success: false,
					Result: errorPrompt(String(error)),
				};
			}

			await Bot.Redis.SetAdd(`seventv:${EmoteSet()}:editors`, [internalUser.Name]);
			return {
				Success: true,
				Result: resultPrompt('Added', user.username),
			};
		}
	},
	LongDescription: async (prefix) => [
		`This command allows the broadcaster to add and remove users as 7TV editors`,

		`**Usage**: ${prefix}editor <username>`,
		`Example: ${prefix}editor @forsen`,
		'Would add the user as an editor',

		'However if the user is already an editor, this command will remove them',
		`**Required 7TV Flags**`,
		`Manage Editors`,
	],
});
