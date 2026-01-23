import { createTRPCRouter, createCallerFactory } from "./init";
import { textsRouter } from "./routers/texts";
import { chaptersRouter } from "./routers/chapters";
import { translationsRouter } from "./routers/translations";
import { endorsementsRouter } from "./routers/endorsements";
import { usersRouter } from "./routers/users";

export const appRouter = createTRPCRouter({
  texts: textsRouter,
  chapters: chaptersRouter,
  translations: translationsRouter,
  endorsements: endorsementsRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
