import { TCommandContext } from './../Typings/types';
import { EPermissionLevel } from './../Typings/enums.js';
import { CommandModel } from '../Models/Command.js';
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
	Code = async (ctx: TCommandContext) => {
		const name = ctx.input[0];
		if (!name) {
			this.Resolve('Please provide a username');
			return;
		}

		const owner = await gql.isAllowedToModify(ctx);
		if (!owner.okay) {
			this.Resolve(owner.message);
			return;
		}

		const user = await gql
			.GetUserByUsername(name.replace('@', ''))
			.catch(() => this.Resolve('User not found'));
		if (!user) return;

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
			await gql
				.ModifyUserEditorPermissions(owner.user_id!, user.id, UserEditorPermissions.NONE)
				.then(async () => {
					await Bot.Redis.SetRemove(`seventv:${owner.emote_set!}:editors`, [
						user.username,
					]);
					this.Resolve(resultPrompt('Removed', user.username));
				})
				.catch((err: string) => this.Resolve(errorPrompt(err)));
			return;
		} else {
			await gql
				.ModifyUserEditorPermissions(owner.user_id!, user.id, UserEditorPermissions.DEFAULT)
				.then(async () => {
					await Bot.Redis.SetAdd(`seventv:${owner.emote_set!}:editors`, [user.username]);
					this.Resolve(resultPrompt('Added', name));
				})
				.catch((err: string) => this.Resolve(errorPrompt(err)));
		}
	};
	LongDescription = async (prefix: string) => [
		`This command allows the broadcaster to add and remove users as 7TV editors`,

		`###### Usage`,
		`${prefix}editor <username>`,
		'Would add the user as an editor',

		'However if the user is already an editor, this command will remove them',
		`**Required 7TV Flags**`,
		`Manage Editors`,
	];
}
