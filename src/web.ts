/* eslint-disable @typescript-eslint/ban-ts-comment */
/*Ignore error not containing required data*/
// @ts-ignore
global.Bot = {};
// @ts-ignore
Bot.Config = {};
// @ts-ignore
Bot.Config.Twitch = {};
// @ts-ignore
Bot.Config.SQL = {};

import { Setup } from './CreateEnv.js';
Setup.All().then((cfg) => Setup.Web(cfg).then((App) => App.Listen()));
