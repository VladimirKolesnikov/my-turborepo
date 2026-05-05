CREATE TABLE "processing_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"source_name" varchar(255),
	"raw_content" text NOT NULL,
	"status_code" varchar(50) NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"proposed_category_name" varchar(255) NOT NULL,
	"proposed_description" text NOT NULL,
	"confidence" numeric(5, 4) NOT NULL,
	"final_category_name" varchar(255),
	"final_description" text,
	"decision_status" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "processing_request_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "type_code" varchar(50);--> statement-breakpoint
ALTER TABLE "processing_requests" ADD CONSTRAINT "processing_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_reviews" ADD CONSTRAINT "transaction_reviews_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_reviews_transaction_id_uidx" ON "transaction_reviews" USING btree ("transaction_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_processing_request_id_processing_requests_id_fk" FOREIGN KEY ("processing_request_id") REFERENCES "public"."processing_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_type_code_category_types_code_fk" FOREIGN KEY ("type_code") REFERENCES "public"."category_types"("code") ON DELETE no action ON UPDATE no action;