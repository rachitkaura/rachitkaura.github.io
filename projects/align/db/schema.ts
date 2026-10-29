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
