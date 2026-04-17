export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          request_count: number
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          request_count?: number
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          request_count?: number
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      article_company_tags: {
        Row: {
          article_id: string
          company_name: string
          created_at: string
          id: string
          orgnr: string
        }
        Insert: {
          article_id: string
          company_name?: string
          created_at?: string
          id?: string
          orgnr: string
        }
        Update: {
          article_id?: string
          company_name?: string
          created_at?: string
          id?: string
          orgnr?: string
        }
        Relationships: []
      }
      article_notes: {
        Row: {
          article_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      article_shared_regions: {
        Row: {
          article_id: string
          created_at: string
          id: string
          region_slug: string
          shared_by: string | null
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          region_slug: string
          shared_by?: string | null
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          region_slug?: string
          shared_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_shared_regions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_shared_regions_region_slug_fkey"
            columns: ["region_slug"]
            isOneToOne: false
            referencedRelation: "editorial_regions"
            referencedColumns: ["slug"]
          },
        ]
      }
      article_sources: {
        Row: {
          content: string | null
          created_at: string
          file_url: string | null
          id: string
          metadata: Json
          source_type: string
          source_url: string | null
          title: string
          updated_at: string
          uploaded_by: string
          used_in_article: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          metadata?: Json
          source_type: string
          source_url?: string | null
          title: string
          updated_at?: string
          uploaded_by: string
          used_in_article?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          metadata?: Json
          source_type?: string
          source_url?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string
          used_in_article?: string | null
        }
        Relationships: []
      }
      article_tags: {
        Row: {
          article_id: string
          created_at: string
          created_by: string | null
          id: string
          tag_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          tag_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      article_views: {
        Row: {
          article_id: string
          completed: boolean
          country: string | null
          device_type: string | null
          id: string
          read_seconds: number
          referrer_host: string | null
          region_slug: string | null
          scroll_depth: number
          session_id: string
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          article_id: string
          completed?: boolean
          country?: string | null
          device_type?: string | null
          id?: string
          read_seconds?: number
          referrer_host?: string | null
          region_slug?: string | null
          scroll_depth?: number
          session_id: string
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          article_id?: string
          completed?: boolean
          country?: string | null
          device_type?: string | null
          id?: string
          read_seconds?: number
          referrer_host?: string | null
          region_slug?: string | null
          scroll_depth?: number
          session_id?: string
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          author: string
          body: string
          body_en: string | null
          category: string
          created_at: string
          created_by: string | null
          excerpt: string
          excerpt_en: string | null
          forked_from_article_id: string | null
          id: string
          image_crop: Json | null
          image_focal: Json | null
          image_url: string | null
          key_points: Json | null
          key_points_en: Json | null
          premium: boolean
          published: boolean
          published_at: string | null
          read_time: string | null
          region_slug: string | null
          status: string
          title: string
          title_en: string | null
          type: string
          updated_at: string
        }
        Insert: {
          author: string
          body: string
          body_en?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          excerpt: string
          excerpt_en?: string | null
          forked_from_article_id?: string | null
          id?: string
          image_crop?: Json | null
          image_focal?: Json | null
          image_url?: string | null
          key_points?: Json | null
          key_points_en?: Json | null
          premium?: boolean
          published?: boolean
          published_at?: string | null
          read_time?: string | null
          region_slug?: string | null
          status?: string
          title: string
          title_en?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          author?: string
          body?: string
          body_en?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          excerpt?: string
          excerpt_en?: string | null
          forked_from_article_id?: string | null
          id?: string
          image_crop?: Json | null
          image_focal?: Json | null
          image_url?: string | null
          key_points?: Json | null
          key_points_en?: Json | null
          premium?: boolean
          published?: boolean
          published_at?: string | null
          read_time?: string | null
          region_slug?: string | null
          status?: string
          title?: string
          title_en?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_forked_from_article_id_fkey"
            columns: ["forked_from_article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_region_slug_fkey"
            columns: ["region_slug"]
            isOneToOne: false
            referencedRelation: "editorial_regions"
            referencedColumns: ["slug"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          name_en: string | null
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          name_en?: string | null
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          name_en?: string | null
          slug?: string
        }
        Relationships: []
      }
      company_list_items: {
        Row: {
          added_at: string
          company_name: string
          id: string
          list_id: string
          orgnr: string
        }
        Insert: {
          added_at?: string
          company_name: string
          id?: string
          list_id: string
          orgnr: string
        }
        Update: {
          added_at?: string
          company_name?: string
          id?: string
          list_id?: string
          orgnr?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "company_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      company_lists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      editorial_guidelines: {
        Row: {
          article_type: string
          created_at: string
          display_name: string
          id: string
          max_words: number
          min_paragraphs: number
          rules: string
          updated_at: string
        }
        Insert: {
          article_type: string
          created_at?: string
          display_name: string
          id?: string
          max_words?: number
          min_paragraphs?: number
          rules?: string
          updated_at?: string
        }
        Update: {
          article_type?: string
          created_at?: string
          display_name?: string
          id?: string
          max_words?: number
          min_paragraphs?: number
          rules?: string
          updated_at?: string
        }
        Relationships: []
      }
      editorial_regions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      fact_boxes: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          image_caption: string | null
          image_url: string | null
          items: Json
          search_text: string
          tags: string[]
          title: string
          updated_at: string
          variant: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_caption?: string | null
          image_url?: string | null
          items?: Json
          search_text?: string
          tags?: string[]
          title: string
          updated_at?: string
          variant?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_caption?: string | null
          image_url?: string | null
          items?: Json
          search_text?: string
          tags?: string[]
          title?: string
          updated_at?: string
          variant?: string
        }
        Relationships: []
      }
      group_invitations: {
        Row: {
          created_at: string
          group_id: string
          id: string
          invite_email: string | null
          invite_phone: string | null
          invited_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          invite_email?: string | null
          invite_phone?: string | null
          invited_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          invite_email?: string | null
          invite_phone?: string | null
          invited_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_invitations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          article_id: string | null
          content: string
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          article_id?: string | null
          content: string
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          article_id?: string | null
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      hjernevelv_articles: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          excerpt: string
          id: string
          image_url: string | null
          published: boolean
          published_at: string | null
          read_time: string | null
          region_slug: string | null
          title: string
          topic: string | null
          updated_at: string
          writer_id: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          excerpt: string
          id?: string
          image_url?: string | null
          published?: boolean
          published_at?: string | null
          read_time?: string | null
          region_slug?: string | null
          title: string
          topic?: string | null
          updated_at?: string
          writer_id: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          excerpt?: string
          id?: string
          image_url?: string | null
          published?: boolean
          published_at?: string | null
          read_time?: string | null
          region_slug?: string | null
          title?: string
          topic?: string | null
          updated_at?: string
          writer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hjernevelv_articles_region_slug_fkey"
            columns: ["region_slug"]
            isOneToOne: false
            referencedRelation: "editorial_regions"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "hjernevelv_articles_writer_id_fkey"
            columns: ["writer_id"]
            isOneToOne: false
            referencedRelation: "hjernevelv_writers"
            referencedColumns: ["id"]
          },
        ]
      }
      hjernevelv_panel_questions: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          is_anonymous: boolean
          moderator_note: string | null
          panel_id: string
          question: string
          status: string
          updated_at: string
          upvotes: number
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_anonymous?: boolean
          moderator_note?: string | null
          panel_id: string
          question: string
          status?: string
          updated_at?: string
          upvotes?: number
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_anonymous?: boolean
          moderator_note?: string | null
          panel_id?: string
          question?: string
          status?: string
          updated_at?: string
          upvotes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hjernevelv_panel_questions_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "hjernevelv_panels"
            referencedColumns: ["id"]
          },
        ]
      }
      hjernevelv_panel_registrations: {
        Row: {
          attended: boolean | null
          comment: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          panel_id: string
          user_id: string
        }
        Insert: {
          attended?: boolean | null
          comment?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          panel_id: string
          user_id: string
        }
        Update: {
          attended?: boolean | null
          comment?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          panel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hjernevelv_panel_registrations_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "hjernevelv_panels"
            referencedColumns: ["id"]
          },
        ]
      }
      hjernevelv_panelists: {
        Row: {
          created_at: string
          id: string
          panel_id: string
          role: string
          writer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          panel_id: string
          role?: string
          writer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          panel_id?: string
          role?: string
          writer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hjernevelv_panelists_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "hjernevelv_panels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hjernevelv_panelists_writer_id_fkey"
            columns: ["writer_id"]
            isOneToOne: false
            referencedRelation: "hjernevelv_writers"
            referencedColumns: ["id"]
          },
        ]
      }
      hjernevelv_panels: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          format: string
          id: string
          location: string | null
          max_attendees: number | null
          meeting_url: string | null
          region_slug: string | null
          scheduled_at: string
          status: string
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          format?: string
          id?: string
          location?: string | null
          max_attendees?: number | null
          meeting_url?: string | null
          region_slug?: string | null
          scheduled_at: string
          status?: string
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          format?: string
          id?: string
          location?: string | null
          max_attendees?: number | null
          meeting_url?: string | null
          region_slug?: string | null
          scheduled_at?: string
          status?: string
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hjernevelv_panels_region_slug_fkey"
            columns: ["region_slug"]
            isOneToOne: false
            referencedRelation: "editorial_regions"
            referencedColumns: ["slug"]
          },
        ]
      }
      hjernevelv_writers: {
        Row: {
          active: boolean
          avatar_url: string | null
          bio: string | null
          created_at: string
          expertise: string[]
          id: string
          linkedin_url: string | null
          name: string
          region_slug: string | null
          slug: string
          twitter_url: string | null
          updated_at: string
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          expertise?: string[]
          id?: string
          linkedin_url?: string | null
          name: string
          region_slug?: string | null
          slug: string
          twitter_url?: string | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          expertise?: string[]
          id?: string
          linkedin_url?: string | null
          name?: string
          region_slug?: string | null
          slug?: string
          twitter_url?: string | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hjernevelv_writers_region_slug_fkey"
            columns: ["region_slug"]
            isOneToOne: false
            referencedRelation: "editorial_regions"
            referencedColumns: ["slug"]
          },
        ]
      }
      job_changes: {
        Row: {
          change_type: string
          created_at: string
          generated_notice: string | null
          id: string
          image_url: string | null
          new_company: string | null
          new_role: string | null
          old_company: string | null
          old_role: string | null
          person_name: string
          photo_credit: string | null
          published_at: string | null
          reviewed_by: string | null
          source_text: string | null
          source_url: string | null
          status: string
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          change_type?: string
          created_at?: string
          generated_notice?: string | null
          id?: string
          image_url?: string | null
          new_company?: string | null
          new_role?: string | null
          old_company?: string | null
          old_role?: string | null
          person_name: string
          photo_credit?: string | null
          published_at?: string | null
          reviewed_by?: string | null
          source_text?: string | null
          source_url?: string | null
          status?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          change_type?: string
          created_at?: string
          generated_notice?: string | null
          id?: string
          image_url?: string | null
          new_company?: string | null
          new_role?: string | null
          old_company?: string | null
          old_role?: string | null
          person_name?: string
          photo_credit?: string | null
          published_at?: string | null
          reviewed_by?: string | null
          source_text?: string | null
          source_url?: string | null
          status?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      job_listings: {
        Row: {
          application_deadline: string | null
          application_url: string | null
          company_logo_url: string | null
          company_name: string
          company_orgnr: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          description_html: string
          employment_type: string
          expires_at: string | null
          id: string
          industry: string | null
          location: string
          published_at: string | null
          region_slug: string | null
          rejection_reason: string | null
          reviewed_by: string | null
          salary_range: string | null
          status: string
          submitted_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          application_deadline?: string | null
          application_url?: string | null
          company_logo_url?: string | null
          company_name: string
          company_orgnr?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description_html: string
          employment_type?: string
          expires_at?: string | null
          id?: string
          industry?: string | null
          location: string
          published_at?: string | null
          region_slug?: string | null
          rejection_reason?: string | null
          reviewed_by?: string | null
          salary_range?: string | null
          status?: string
          submitted_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          application_deadline?: string | null
          application_url?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_orgnr?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description_html?: string
          employment_type?: string
          expires_at?: string | null
          id?: string
          industry?: string | null
          location?: string
          published_at?: string | null
          region_slug?: string | null
          rejection_reason?: string | null
          reviewed_by?: string | null
          salary_range?: string | null
          status?: string
          submitted_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_listings_region_slug_fkey"
            columns: ["region_slug"]
            isOneToOne: false
            referencedRelation: "editorial_regions"
            referencedColumns: ["slug"]
          },
        ]
      }
      newsletter_issues: {
        Row: {
          created_at: string
          created_by: string | null
          html_content: string
          id: string
          preview_text: string | null
          recipient_count: number | null
          region_slug: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          subject: string
          triggered_by: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          html_content: string
          id?: string
          preview_text?: string | null
          recipient_count?: number | null
          region_slug?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          triggered_by?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          html_content?: string
          id?: string
          preview_text?: string | null
          recipient_count?: number | null
          region_slug?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          triggered_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_issues_region_slug_fkey"
            columns: ["region_slug"]
            isOneToOne: false
            referencedRelation: "editorial_regions"
            referencedColumns: ["slug"]
          },
        ]
      }
      newsletter_subscriptions: {
        Row: {
          confirmation_token: string
          confirmed: boolean
          confirmed_at: string | null
          created_at: string
          email: string
          frequency: string
          id: string
          last_sent_at: string | null
          region_slugs: string[]
          topics: string[]
          unsubscribe_token: string
          unsubscribed_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          confirmation_token?: string
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          email: string
          frequency?: string
          id?: string
          last_sent_at?: string | null
          region_slugs?: string[]
          topics?: string[]
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          confirmation_token?: string
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          email?: string
          frequency?: string
          id?: string
          last_sent_at?: string | null
          region_slugs?: string[]
          topics?: string[]
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          editorial_region: string | null
          email: string | null
          hidden_elements: string[] | null
          id: string
          proofread_settings: Json | null
          region: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          editorial_region?: string | null
          email?: string | null
          hidden_elements?: string[] | null
          id?: string
          proofread_settings?: Json | null
          region?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          editorial_region?: string | null
          email?: string | null
          hidden_elements?: string[] | null
          id?: string
          proofread_settings?: Json | null
          region?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_editorial_region_fkey"
            columns: ["editorial_region"]
            isOneToOne: false
            referencedRelation: "editorial_regions"
            referencedColumns: ["slug"]
          },
        ]
      }
      snake_scores: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          score: number
          speed: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          score: number
          speed: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          score?: number
          speed?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      tip_rate_limits: {
        Row: {
          ip_hash: string
          submission_count: number
          window_start: string
        }
        Insert: {
          ip_hash: string
          submission_count?: number
          window_start?: string
        }
        Update: {
          ip_hash?: string
          submission_count?: number
          window_start?: string
        }
        Relationships: []
      }
      tips: {
        Row: {
          content: string
          created_at: string
          follow_up_email: string | null
          id: string
          is_anonymous: boolean
          journalist_id: string
          journalist_name: string
        }
        Insert: {
          content: string
          created_at?: string
          follow_up_email?: string | null
          id?: string
          is_anonymous?: boolean
          journalist_id: string
          journalist_name: string
        }
        Update: {
          content?: string
          created_at?: string
          follow_up_email?: string | null
          id?: string
          is_anonymous?: boolean
          journalist_id?: string
          journalist_name?: string
        }
        Relationships: []
      }
      user_events: {
        Row: {
          event_data: Json
          event_type: string
          id: string
          occurred_at: string
          referrer_host: string | null
          region_slug: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          event_data?: Json
          event_type: string
          id?: string
          occurred_at?: string
          referrer_host?: string | null
          region_slug?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          event_data?: Json
          event_type?: string
          id?: string
          occurred_at?: string
          referrer_host?: string | null
          region_slug?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_grant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      admin_list_users: {
        Args: { _limit?: number; _search?: string }
        Returns: {
          api_key_count: number
          api_last_used_at: string
          articles_read: number
          created_at: string
          display_name: string
          email: string
          last_seen_at: string
          roles: Database["public"]["Enums"]["app_role"][]
          user_id: string
        }[]
      }
      admin_revoke_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      analytics_breakdown: {
        Args: { _dimension: string; _from: string; _to: string }
        Returns: {
          bucket: string
          unique_sessions: number
          views: number
        }[]
      }
      analytics_conversion_funnel: {
        Args: { _from: string; _to: string }
        Returns: {
          step: string
          step_order: number
          user_count: number
        }[]
      }
      analytics_daily_traffic: {
        Args: { _from: string; _to: string }
        Returns: {
          day: string
          unique_sessions: number
          unique_users: number
          views: number
        }[]
      }
      analytics_top_articles: {
        Args: { _from: string; _limit?: number; _to: string }
        Returns: {
          article_id: string
          avg_read_seconds: number
          completion_rate: number
          region_slug: string
          title: string
          unique_sessions: number
          views: number
        }[]
      }
      analytics_user_growth: {
        Args: { _from: string; _to: string }
        Returns: {
          daily_active_users: number
          day: string
          new_signups: number
        }[]
      }
      create_api_key: {
        Args: {
          _expires_at?: string
          _key_hash: string
          _key_prefix: string
          _name: string
        }
        Returns: {
          created_at: string
          id: string
          key_prefix: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hjernevelv_panel_counts: {
        Args: { _panel_id: string }
        Returns: {
          approved_question_count: number
          registration_count: number
        }[]
      }
      is_group_admin: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      merge_tags: {
        Args: { _source_id: string; _target_id: string }
        Returns: undefined
      }
      revoke_api_key: { Args: { _id: string }; Returns: undefined }
      validate_api_key: {
        Args: { _key_hash: string }
        Returns: {
          key_id: string
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "editor"
        | "journalist"
        | "reader"
        | "subscriber"
        | "contributor"
        | "business"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "editor",
        "journalist",
        "reader",
        "subscriber",
        "contributor",
        "business",
      ],
    },
  },
} as const
