import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  registerUserInputSchema,
  loginInputSchema,
  updateUserProfileInputSchema,
  createReportInputSchema,
  updateReportInputSchema,
  getReportsInputSchema,
  reviewReportInputSchema,
  addCommentInputSchema,
  uploadAttachmentInputSchema
} from './schema';

// Import handlers
import { registerUser } from './handlers/register_user';
import { loginUser } from './handlers/login_user';
import { updateUserProfile } from './handlers/update_user_profile';
import { getUsers } from './handlers/get_users';
import { createReport } from './handlers/create_report';
import { updateReport } from './handlers/update_report';
import { getReports } from './handlers/get_reports';
import { getReportById } from './handlers/get_report_by_id';
import { deleteReport } from './handlers/delete_report';
import { reviewReport } from './handlers/review_report';
import { addComment } from './handlers/add_comment';
import { getReportComments } from './handlers/get_report_comments';
import { uploadAttachment } from './handlers/upload_attachment';
import { getReportAttachments } from './handlers/get_report_attachments';
import { deleteAttachment } from './handlers/delete_attachment';
import { getDashboardStats } from './handlers/get_dashboard_stats';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management routes
  registerUser: publicProcedure
    .input(registerUserInputSchema)
    .mutation(({ input }) => registerUser(input)),

  loginUser: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  updateUserProfile: publicProcedure
    .input(updateUserProfileInputSchema)
    .mutation(({ input }) => updateUserProfile(input)),

  getUsers: publicProcedure
    .query(() => getUsers()),

  // Report management routes
  createReport: publicProcedure
    .input(createReportInputSchema)
    .mutation(({ input }) => {
      // TODO: Extract userId from authentication context
      const userId = 1; // Placeholder
      return createReport(input, userId);
    }),

  updateReport: publicProcedure
    .input(updateReportInputSchema)
    .mutation(({ input }) => {
      // TODO: Extract userId from authentication context
      const userId = 1; // Placeholder
      return updateReport(input, userId);
    }),

  getReports: publicProcedure
    .input(getReportsInputSchema)
    .query(({ input }) => {
      // TODO: Extract userId and userRole from authentication context
      const userId = 1; // Placeholder
      const userRole = 'STAFF'; // Placeholder
      return getReports(input, userId, userRole);
    }),

  getReportById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => {
      // TODO: Extract userId and userRole from authentication context
      const userId = 1; // Placeholder
      const userRole = 'STAFF'; // Placeholder
      return getReportById(input.id, userId, userRole);
    }),

  deleteReport: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => {
      // TODO: Extract userId and userRole from authentication context
      const userId = 1; // Placeholder
      const userRole = 'STAFF'; // Placeholder
      return deleteReport(input.id, userId, userRole);
    }),

  // Report review routes (for PIMPINAN/ADMIN)
  reviewReport: publicProcedure
    .input(reviewReportInputSchema)
    .mutation(({ input }) => {
      // TODO: Extract userId from authentication context
      const userId = 1; // Placeholder
      return reviewReport(input, userId);
    }),

  // Comment routes
  addComment: publicProcedure
    .input(addCommentInputSchema)
    .mutation(({ input }) => {
      // TODO: Extract userId from authentication context
      const userId = 1; // Placeholder
      return addComment(input, userId);
    }),

  getReportComments: publicProcedure
    .input(z.object({ reportId: z.number() }))
    .query(({ input }) => {
      // TODO: Extract userId and userRole from authentication context
      const userId = 1; // Placeholder
      const userRole = 'STAFF'; // Placeholder
      return getReportComments(input.reportId, userId, userRole);
    }),

  // Attachment routes
  uploadAttachment: publicProcedure
    .input(uploadAttachmentInputSchema)
    .mutation(({ input }) => {
      // TODO: Extract userId from authentication context
      const userId = 1; // Placeholder
      return uploadAttachment(input, userId);
    }),

  getReportAttachments: publicProcedure
    .input(z.object({ reportId: z.number() }))
    .query(({ input }) => {
      // TODO: Extract userId and userRole from authentication context
      const userId = 1; // Placeholder
      const userRole = 'STAFF'; // Placeholder
      return getReportAttachments(input.reportId, userId, userRole);
    }),

  deleteAttachment: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => {
      // TODO: Extract userId and userRole from authentication context
      const userId = 1; // Placeholder
      const userRole = 'STAFF'; // Placeholder
      return deleteAttachment(input.id, userId, userRole);
    }),

  // Dashboard route
  getDashboardStats: publicProcedure
    .query(() => {
      // TODO: Extract userId and userRole from authentication context
      const userId = 1; // Placeholder
      const userRole = 'ADMIN'; // Placeholder
      return getDashboardStats(userId, userRole);
    }),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();