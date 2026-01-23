CREATE TABLE "authors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_original_script" varchar(255),
	"slug" varchar(255) NOT NULL,
	"era" varchar(255),
	"description" text,
	CONSTRAINT "authors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" serial PRIMARY KEY NOT NULL,
	"text_id" integer NOT NULL,
	"chapter_number" integer NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(500),
	"source_content" jsonb,
	"ordering" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "endorsements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"translation_version_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	CONSTRAINT "languages_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "texts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"title_original_script" varchar(500),
	"slug" varchar(500) NOT NULL,
	"language_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"description" text,
	"source_url" text,
	"total_chapters" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translation_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"translation_id" integer NOT NULL,
	"version_number" integer NOT NULL,
	"content" jsonb NOT NULL,
	"author_id" integer NOT NULL,
	"edit_summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"previous_version_id" integer
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"current_version_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(100) NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar(20) DEFAULT 'editor' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_text_id_texts_id_fk" FOREIGN KEY ("text_id") REFERENCES "public"."texts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_translation_version_id_translation_versions_id_fk" FOREIGN KEY ("translation_version_id") REFERENCES "public"."translation_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "texts" ADD CONSTRAINT "texts_language_id_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "texts" ADD CONSTRAINT "texts_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_versions" ADD CONSTRAINT "translation_versions_translation_id_translations_id_fk" FOREIGN KEY ("translation_id") REFERENCES "public"."translations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_versions" ADD CONSTRAINT "translation_versions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chapters_text_number_idx" ON "chapters" USING btree ("text_id","chapter_number");--> statement-breakpoint
CREATE INDEX "chapters_text_id_idx" ON "chapters" USING btree ("text_id");--> statement-breakpoint
CREATE UNIQUE INDEX "endorsements_user_version_idx" ON "endorsements" USING btree ("user_id","translation_version_id");--> statement-breakpoint
CREATE INDEX "endorsements_version_id_idx" ON "endorsements" USING btree ("translation_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "texts_language_slug_idx" ON "texts" USING btree ("language_id","slug");--> statement-breakpoint
CREATE INDEX "tv_translation_id_idx" ON "translation_versions" USING btree ("translation_id");--> statement-breakpoint
CREATE INDEX "tv_author_id_idx" ON "translation_versions" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "translations_chapter_id_idx" ON "translations" USING btree ("chapter_id");