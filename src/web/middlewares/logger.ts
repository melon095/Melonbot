import express from 'express';

export default (req: express.Request, res: express.Response, next: express.NextFunction) => {
	Bot.Log.Info(req.url);
	next();
};
