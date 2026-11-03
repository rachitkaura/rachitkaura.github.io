import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
export const workspaces = sqliteTable('workspaces', { userId: text('user_id').primaryKey(), data: text('data').notNull(), updatedAt: text('updated_at').notNull() });

export const companies = sqliteTable('live_companies', {
  id:text('id').primaryKey(), ownerId:text('owner_id').notNull(), name:text('name').notNull(), domain:text('domain').notNull(),
  verificationToken:text('verification_token').notNull(), verifiedAt:text('verified_at'), createdAt:text('created_at').notNull(),
  reviewStatus:text('review_status').notNull().default('unsubmitted'), reviewData:text('review_data').notNull().default('{}'),
  reviewRequestedAt:text('review_requested_at'), reviewedAt:text('reviewed_at'), reviewedBy:text('reviewed_by'), reviewReason:text('review_reason').notNull().default(''),
}, t=>[uniqueIndex('company_domain_unique').on(t.domain)]);
export const members = sqliteTable('live_members', {
  id:text('id').primaryKey(), companyId:text('company_id').notNull().references(()=>companies.id),
  email:text('email').notNull(), userId:text('user_id'), role:text('role').notNull(),
},t=>[index('members_user_idx').on(t.userId),uniqueIndex('members_company_email').on(t.companyId,t.email)]);
export const liveProfiles = sqliteTable('live_profiles', {
  id:text('id').primaryKey(), userId:text('user_id').notNull(), data:text('data').notNull(), privacy:text('privacy').notNull(), updatedAt:text('updated_at').notNull(),
  photoKey:text('photo_key'), identityVerifiedAt:text('identity_verified_at'), verifiedName:text('verified_name'),
},t=>[uniqueIndex('live_profile_user_unique').on(t.userId)]);
export const liveJobs = sqliteTable('live_jobs', {
  id:text('id').primaryKey(), companyId:text('company_id').notNull().references(()=>companies.id), data:text('data').notNull(),
  status:text('status').notNull(), confirmedAt:text('confirmed_at').notNull(), expiresAt:text('expires_at').notNull(), createdAt:text('created_at').notNull(),
},t=>[index('live_job_company_idx').on(t.companyId)]);
export const applications = sqliteTable('live_applications', {
  id:text('id').primaryKey(), candidateId:text('candidate_id').notNull().references(()=>liveProfiles.id),
  candidateUserId:text('candidate_user_id').notNull(), jobId:text('job_id').notNull().references(()=>liveJobs.id),
  companyId:text('company_id').notNull().references(()=>companies.id), candidateInterest:integer('candidate_interest').notNull().default(0),
  employerInterest:integer('employer_interest').notNull().default(0), stage:text('stage').notNull(), data:text('data').notNull(),
  createdAt:text('created_at').notNull(), updatedAt:text('updated_at').notNull(),
},t=>[uniqueIndex('live_application_unique').on(t.candidateId,t.jobId),index('applications_user_idx').on(t.candidateUserId),index('applications_company_idx').on(t.companyId)]);
export const liveMessages = sqliteTable('live_messages', {
  id:text('id').primaryKey(), applicationId:text('application_id').notNull().references(()=>applications.id),
  senderId:text('sender_id').notNull(), body:text('body').notNull(), createdAt:text('created_at').notNull(),
},t=>[index('messages_application_idx').on(t.applicationId)]);
export const slots = sqliteTable('live_slots', {
  id:text('id').primaryKey(), ownerId:text('owner_id').notNull(), startsAt:text('starts_at').notNull(), endsAt:text('ends_at').notNull(), createdAt:text('created_at').notNull(),
},t=>[index('slots_owner_idx').on(t.ownerId)]);
export const liveInterviews = sqliteTable('live_interviews', {
  id:text('id').primaryKey(), applicationId:text('application_id').notNull().references(()=>applications.id),
  slotId:text('slot_id').notNull().references(()=>slots.id), hostId:text('host_id').notNull(), guestId:text('guest_id').notNull(),
  startsAt:text('starts_at').notNull(), endsAt:text('ends_at').notNull(), status:text('status').notNull(), notes:text('notes').notNull(), createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('interview_slot_unique').on(t.slotId)]);
export const notifications = sqliteTable('live_notifications', {
  id:text('id').primaryKey(), userId:text('user_id').notNull(), body:text('body').notNull(), createdAt:text('created_at').notNull(), readAt:text('read_at'),
},t=>[index('notifications_user_idx').on(t.userId)]);
export const settings = sqliteTable('live_settings', {userId:text('user_id').primaryKey(),data:text('data').notNull(),updatedAt:text('updated_at').notNull()});

export const profileVerifications=sqliteTable('profile_verifications',{
  id:text('id').primaryKey(), userId:text('user_id').notNull(), profileId:text('profile_id').notNull().references(()=>liveProfiles.id),
  submittedName:text('submitted_name').notNull(), photoKey:text('photo_key'), idKey:text('id_key'), status:text('status').notNull(),
  submittedAt:text('submitted_at').notNull(), expiresAt:text('expires_at').notNull(), reviewedAt:text('reviewed_at'),reviewedBy:text('reviewed_by'),reason:text('reason').notNull().default(''),
},t=>[uniqueIndex('verification_user_unique').on(t.userId),index('verification_status_idx').on(t.status)]);
export const verificationAudit=sqliteTable('verification_audit',{
  id:text('id').primaryKey(), subjectType:text('subject_type').notNull(),subjectId:text('subject_id').notNull(),
  actorId:text('actor_id').notNull(),action:text('action').notNull(),reason:text('reason').notNull(),createdAt:text('created_at').notNull(),
},t=>[index('verification_audit_subject_idx').on(t.subjectType,t.subjectId)]);
export const verificationCleanup=sqliteTable('verification_cleanup',{
  key:text('key').primaryKey(),createdAt:text('created_at').notNull(),
});

export const reviewBatches=sqliteTable('review_batches',{
 id:text('id').primaryKey(),jobId:text('job_id').notNull().references(()=>liveJobs.id),capacity:integer('capacity').notNull(),deadline:text('deadline').notNull(),createdAt:text('created_at').notNull(),
});
export const reviewReservations=sqliteTable('review_reservations',{
 id:text('id').primaryKey(),batchId:text('batch_id').notNull().references(()=>reviewBatches.id),userId:text('user_id').notNull(),status:text('status').notNull(),outcome:text('outcome').notNull().default(''),note:text('note').notNull().default(''),createdAt:text('created_at').notNull(),reviewedAt:text('reviewed_at'),
},t=>[uniqueIndex('reservation_batch_user').on(t.batchId,t.userId),index('reservation_batch_status').on(t.batchId,t.status)]);
export const proofCards=sqliteTable('proof_cards',{
 id:text('id').primaryKey(),userId:text('user_id').notNull(),data:text('data').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[index('proof_owner').on(t.userId)]);
export const proofShares=sqliteTable('proof_shares',{
 id:text('id').primaryKey(),cardId:text('card_id').notNull().references(()=>proofCards.id),applicationId:text('application_id').notNull().references(()=>applications.id),review:text('review').notNull().default(''),question:text('question').notNull().default(''),reviewedBy:text('reviewed_by'),checks:text('checks').notNull().default('[]'),updatedAt:text('updated_at').notNull(),
},t=>[uniqueIndex('proof_share_unique').on(t.cardId,t.applicationId),index('proof_share_application').on(t.applicationId)]);
export const calibrations=sqliteTable('hiring_calibrations',{
 id:text('id').primaryKey(),jobId:text('job_id').notNull().references(()=>liveJobs.id),version:integer('version').notNull(),jobData:text('job_data').notNull(),data:text('data').notNull(),status:text('status').notNull(),createdAt:text('created_at').notNull(),approvedAt:text('approved_at'),
},t=>[uniqueIndex('calibration_job_version').on(t.jobId,t.version)]);
export const calibrationVotes=sqliteTable('calibration_votes',{
 id:text('id').primaryKey(),calibrationId:text('calibration_id').notNull().references(()=>calibrations.id),userId:text('user_id').notNull(),data:text('data').notNull(),createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('calibration_voter').on(t.calibrationId,t.userId)]);

export const pendingSwipes=sqliteTable('pending_swipes',{
 id:text('id').primaryKey(),userId:text('user_id').notNull(),actor:text('actor').notNull(),origin:text('origin').notNull(),payload:text('payload').notNull(),label:text('label').notNull(),companyId:text('company_id'),
 dueAt:integer('due_at').notNull(),state:text('state').notNull(),error:text('error').notNull().default(''),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull(),
},t=>[index('pending_swipes_due').on(t.state,t.dueAt),index('pending_swipes_user').on(t.userId,t.updatedAt)]);
export const emailPreferences=sqliteTable('email_preferences',{
 userId:text('user_id').primaryKey(),email:text('email').notNull(),enabled:integer('enabled').notNull().default(0),events:text('events').notNull(),enabledAt:text('enabled_at').notNull(),updatedAt:text('updated_at').notNull(),
});
export const emailDeliveries=sqliteTable('email_deliveries',{
 id:text('id').primaryKey(),userId:text('user_id').notNull(),state:text('state').notNull(),attempts:integer('attempts').notNull().default(0),nextAttempt:integer('next_attempt').notNull(),updatedAt:integer('updated_at').notNull(),
},t=>[index('email_deliveries_due').on(t.state,t.nextAttempt)]);
