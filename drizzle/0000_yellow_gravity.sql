CREATE TABLE "collection_rows" (
	"id" text PRIMARY KEY NOT NULL,
	"collection_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_by" text,
	"created_by_name" text,
	"updated_by_user_id" text,
	"updated_by_name" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"fields" jsonb NOT NULL,
	"created_by" text,
	"created_by_name" text,
	"updated_by_user_id" text,
	"updated_by_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot_docs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"category" text,
	"updated_by_user_id" text,
	"updated_by_name" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cron_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"schedule" text NOT NULL,
	"schedule_description" text,
	"action" text NOT NULL,
	"args" jsonb DEFAULT '{}'::jsonb,
	"notify_user_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"last_run_at" bigint,
	"next_run_at" bigint,
	"run_count" integer DEFAULT 0 NOT NULL,
	"last_result" text,
	"created_by_user_id" text,
	"created_by_name" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text,
	"user_role" text,
	"action" text NOT NULL,
	"resource_table" text NOT NULL,
	"resource_id" text,
	"before_data" jsonb,
	"after_data" jsonb,
	"permission_request_id" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permission_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"requester_id" text NOT NULL,
	"requester_name" text,
	"approver_id" text NOT NULL,
	"approver_name" text,
	"resource" text NOT NULL,
	"requested_access" text NOT NULL,
	"reason" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"granted_access" text,
	"created_at" bigint NOT NULL,
	"resolved_at" bigint
);
--> statement-breakpoint
CREATE TABLE "conversation_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"channel" text NOT NULL,
	"channel_user_id" text NOT NULL,
	"user_name" text,
	"user_role" text,
	"active_instance_id" text,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_message_at" bigint NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"s3_key" text NOT NULL,
	"s3_url" text,
	"uploaded_by" text NOT NULL,
	"channel" text NOT NULL,
	"workflow_instance_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "super_admins" (
	"id" text PRIMARY KEY NOT NULL,
	"channel" text DEFAULT 'telegram' NOT NULL,
	"channel_user_id" text NOT NULL,
	"display_name" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_users" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"channel" text NOT NULL,
	"channel_user_id" text NOT NULL,
	"display_name" text,
	"role" text DEFAULT 'user' NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"reports_to" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"bot_token" text,
	"bot_username" text,
	"bot_status" text DEFAULT 'active' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ai_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by_user_id" text,
	"created_by_name" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"domain" text,
	"rule_type" text NOT NULL,
	"conditions" jsonb NOT NULL,
	"actions" jsonb NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by_user_id" text,
	"created_by_name" text,
	"updated_by_user_id" text,
	"updated_by_name" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"schema" jsonb NOT NULL,
	"ui_hints" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by_user_id" text,
	"created_by_name" text,
	"updated_by_user_id" text,
	"updated_by_name" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"config" jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_used_at" bigint,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"instance_id" text NOT NULL,
	"stage_id" text NOT NULL,
	"approver_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"decision_reason" text,
	"auto_approved_by_rule_id" text,
	"created_at" bigint NOT NULL,
	"decided_at" bigint
);
--> statement-breakpoint
CREATE TABLE "workflow_instances" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"initiated_by" text NOT NULL,
	"current_stage_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"form_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"context_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"conversation_id" text,
	"channel" text,
	"history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"completed_at" bigint
);
--> statement-breakpoint
CREATE TABLE "workflow_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"domain" text,
	"version" integer DEFAULT 1 NOT NULL,
	"stages" jsonb NOT NULL,
	"trigger_config" jsonb,
	"config" jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by_user_id" text,
	"created_by_name" text,
	"updated_by_user_id" text,
	"updated_by_name" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collection_rows" ADD CONSTRAINT "collection_rows_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_docs" ADD CONSTRAINT "bot_docs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cron_jobs" ADD CONSTRAINT "cron_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_requests" ADD CONSTRAINT "permission_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_active_instance_id_workflow_instances_id_fk" FOREIGN KEY ("active_instance_id") REFERENCES "public"."workflow_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_rules" ADD CONSTRAINT "business_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_instance_id_workflow_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."workflow_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_auto_approved_by_rule_id_business_rules_id_fk" FOREIGN KEY ("auto_approved_by_rule_id") REFERENCES "public"."business_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_template_id_workflow_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workflow_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bot_docs_tenant" ON "bot_docs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_bot_docs_category" ON "bot_docs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_cron_jobs_tenant" ON "cron_jobs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_cron_jobs_status" ON "cron_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_cron_jobs_next_run" ON "cron_jobs" USING btree ("next_run_at");--> statement-breakpoint
CREATE INDEX "idx_audit_tenant" ON "audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_audit_user" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_table" ON "audit_logs" USING btree ("resource_table");--> statement-breakpoint
CREATE INDEX "idx_perm_req_tenant" ON "permission_requests" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_perm_req_approver" ON "permission_requests" USING btree ("approver_id","status");--> statement-breakpoint
CREATE INDEX "idx_perm_req_requester" ON "permission_requests" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "idx_conv_sessions_tenant" ON "conversation_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_conv_sessions_channel_user" ON "conversation_sessions" USING btree ("channel","channel_user_id");--> statement-breakpoint
CREATE INDEX "idx_conv_sessions_active_instance" ON "conversation_sessions" USING btree ("active_instance_id");--> statement-breakpoint
CREATE INDEX "idx_files_tenant" ON "files" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_files_uploaded_by" ON "files" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "idx_files_created" ON "files" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_super_admins_channel_user" ON "super_admins" USING btree ("channel","channel_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tenant_users_channel_user" ON "tenant_users" USING btree ("tenant_id","channel","channel_user_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_users_tenant" ON "tenant_users" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_users_role" ON "tenant_users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_tenants_status" ON "tenants" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_business_rules_tenant" ON "business_rules" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_business_rules_domain" ON "business_rules" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_business_rules_type" ON "business_rules" USING btree ("rule_type");--> statement-breakpoint
CREATE INDEX "idx_form_templates_tenant" ON "form_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_integrations_tenant" ON "integrations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_integrations_type" ON "integrations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_wf_approvals_instance" ON "workflow_approvals" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "idx_wf_approvals_approver" ON "workflow_approvals" USING btree ("approver_id");--> statement-breakpoint
CREATE INDEX "idx_wf_approvals_status" ON "workflow_approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_wf_instances_template" ON "workflow_instances" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_wf_instances_tenant" ON "workflow_instances" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_wf_instances_status" ON "workflow_instances" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_wf_templates_tenant_name_ver" ON "workflow_templates" USING btree ("tenant_id","name","version");--> statement-breakpoint
CREATE INDEX "idx_wf_templates_tenant" ON "workflow_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_wf_templates_domain" ON "workflow_templates" USING btree ("domain");