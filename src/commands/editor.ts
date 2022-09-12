import { CommandModel, TCommandContext, CommandResult } from '../Models/Command.js';
import { ECommandFlags, EPermissionLevel } from './../Typings/enums.js';
import gql, { UserEditorPermissions } from '../SevenTVGQL.js';

const isAlreadyEditor = async (owner: string, editor: string) => {
	return await Bot.Redis.SetMembers(`seventv:${owner}:editors`).then((editors) =>
		editors.includes(editor),
	);
};

export default class extends CommandModel {
	Name = 'editor';
	Ping = false;
	Description = 'Allows the bot to add and remove users as 7TV editors';
	Permission = EPermissionLevel.BROADCAST;
	OnlyOffline = false;
	Aliases = ['adde', 'addeditor', 'removee', 'removeeditor'];
	Cooldown = 5;
	Params = [];
	Flags = [];
	Code = async (ctx: TCommandContext): Promise<CommandResult> => {
		let internalUser;

		const name = ctx.input[0];
		if (!name) {
			return {
				Success: false,
				Result: 'Please provide a username :(',
			};
		} else {
			try {
				const userName = Bot.User.CleanName(ctx.input[0]);
				internalUser = await Bot.User.ResolveUsername(userName);
			} catch (error) {
				return {
					Success: false,
					Result: 'Unable to find that user',
				};
			}
		}

		const owner = await gql.isAllowedToModify(ctx);
		if (!owner.okay) {
			return {
				Success: false,
				Result: owner.message,
			};
		}

		const user = await gql.GetUserByUsername(internalUser).catch(() => null);
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
				console.error(`7TV - Failed to add editor - ${err}`);
				return err;
			}
		};

		const isEditor = await isAlreadyEditor(owner.user_id!, user.username);
		if (isEditor) {
			try {
				await gql.ModifyUserEditorPermissions(
					owner.user_id!,
					user.id,
					UserEditorPermissions.NONE,
				);
			} catch (error) {
				return {
					Success: false,
					Result: errorPrompt(String(error)),
				};
			}
			await Bot.Redis.SetRemove(`seventv:${owner.emote_set!}:editors`, [user.username]);

			return {
				Success: false,
				Result: resultPrompt('Removed', user.username),
			};
		} else {
			try {
				await gql.ModifyUserEditorPermissions(
					owner.user_id!,
					user.id,
					UserEditorPermissions.DEFAULT,
				);
			} catch (error) {
				return {
					Success: false,
					Result: errorPrompt(String(error)),
				};
			}

			await Bot.Redis.SetAdd(`seventv:${owner.emote_set!}:editors`, [user.username]);
			return {
				Success: true,
				Result: resultPrompt('Added', user.username),
			};
		}
	};
	LongDescription = async (prefix: string) => [
		`This command allows the broadcaster to add and remove users as 7TV editors`,

		`**Usage**: ${prefix}editor <username>`,
		`Example: ${prefix}editor @forsen`,
		'Would add the user as an editor',

		'However if the user is already an editor, this command will remove them',
		`**Required 7TV Flags**`,
		`Manage Editors`,
	];
}
