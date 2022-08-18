/* eslint-disable no-useless-escape */
// https://github.com/DatGuy1/common_badwords_twitch
// eslint-disable-next-line no-misleading-character-class
export const racism1 =
	/(?:(?:\b(?<![-=\.])(?<!\.com\/)|monka)(?:[Nn\x{00F1}]|[Ii7]V)|\/\\\/)[\s\.]*?[liI1y!j\/]+[\s\.]*?(?:[GgbB6934Q🅱qğĜƃ၅5\*][\s\.]*?){2,}(?!arcS|l|Ktlw|ylul|ie217|64|\d? ?times)\\?/;
export const racism2 = /(?<!monte)negr[o|u]s?(?<!ni)/;
export const racism3 = /knee grow/;
export const racism4 = /gibson.*dog/;
/**/
export const url =
	/[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;
export const invisChar =
	/[\u034f\u2800\u{E0000}\u180e\ufeff\u2000-\u200d\u206D]/gu;
export const underage =
	/.*((\b[Ii].[Mm]\b)|(\b[Aa][Mm]\b)|(\b[Ii][Mm]\b)|(\b[Aa][Gg][Ee]\b)) \b([1-9]|1[0-2])\b.*/;
