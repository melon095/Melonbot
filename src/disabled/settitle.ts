// import { token } from './../tools/tools.js';
// import axios from 'axios';
// import { TCommandContext } from './../Typings/types';
// import { EPermissionLevel, ECommandFlags } from './../Typings/enums.js';
// import { CommandModel } from '../Models/Command.js';

// export default class extends CommandModel {
// 	Name = 'settitle';
// 	Ping = true;
// 	Description = `Sets the title of a channel. Requires the broadcaster to login at the bots website: ${Bot.Config.Website.WebUrl}. Only mods and broadcaster may run this command.`;
// 	Permission = EPermissionLevel.MOD;
// 	OnlyOffline = false;
// 	Aliases = [];
// 	Cooldown = 60;
// 	Params = [];
// 	Flags = [ECommandFlags.NO_BANPHRASE];
// 	Code = async (ctx: TCommandContext) => {
// 		const title = ctx.input.splice(0).toString().replace(/,/g, ' ');

// 		if (title === '') {
// 			return this.Resolve("Title can't be empty. :( 👎");
// 		}

// 		const t = await token.User(Number(ctx.channel.Id));

// 		if (t.status === 'MESSAGE') {
// 			return this.Resolve(t.error);
// 		}

// 		if (t.status === 'ERROR') {
// 			this.Reject(new Error(t.error));
// 		}

// 		const options = {
// 			headers: {
// 				'Content-Type': 'application/json',
// 				Authorization: `Bearer ${t.token}`,
// 				'Client-ID': `${Bot.Config.Twitch.ClientID}`,
// 			},
// 		};

// 		const body = { title: title };

// 		await axios
// 			.patch(
// 				`https://api.twitch.tv/helix/channels?broadcaster_id=${ctx.channel.Id}`,
// 				body,
// 				options,
// 			)
// 			.catch((error) => {
// 				this.Reject(new Error(error));
// 			});
// 		this.Resolve(`:) 👍 Set title to ${title}`);
// 	};
// }
