import express from 'express';

export default (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
) => {
	console.log(req.url);
	next();
};
