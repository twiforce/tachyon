# encoding: UTF-8
# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended to check this file into your version control system.

ActiveRecord::Schema.define(:version => 20121007214135) do

  create_table "admin_log_entries", :force => true do |t|
    t.integer  "moder_id"
    t.datetime "created_at", :null => false
    t.datetime "updated_at", :null => false
    t.string   "target"
    t.string   "action"
    t.string   "reason"
  end

  add_index "admin_log_entries", ["moder_id"], :name => "index_admin_log_entries_on_moder_id"

  create_table "bans", :force => true do |t|
    t.string   "reason"
    t.integer  "level"
    t.integer  "ip_id"
    t.integer  "moder_id"
    t.datetime "expires"
    t.datetime "created_at", :null => false
    t.datetime "updated_at", :null => false
  end

  create_table "captchas", :force => true do |t|
    t.string   "word"
    t.integer  "key"
    t.datetime "created_at",                    :null => false
    t.datetime "updated_at",                    :null => false
    t.boolean  "defensive",  :default => false
  end

  add_index "captchas", ["defensive"], :name => "index_captchas_on_defensive"
  add_index "captchas", ["key"], :name => "index_captchas_on_key", :unique => true
  add_index "captchas", ["word"], :name => "index_captchas_on_word", :unique => true

  create_table "defence_tokens", :force => true do |t|
    t.string   "hashname"
    t.datetime "created_at", :null => false
    t.datetime "updated_at", :null => false
  end

  add_index "defence_tokens", ["hashname"], :name => "index_defence_tokens_on_hashname", :unique => true

  create_table "id_counters", :force => true do |t|
    t.integer  "last_rid",      :default => 0
    t.integer  "total_threads", :default => 0
    t.integer  "total_posts",   :default => 0
    t.datetime "created_at",                   :null => false
    t.datetime "updated_at",                   :null => false
  end

  create_table "ips", :force => true do |t|
    t.string   "address"
    t.datetime "last_post"
    t.datetime "last_thread"
    t.boolean  "thread_captcha_needed", :default => false
    t.boolean  "post_captcha_needed",   :default => false
    t.datetime "created_at",                               :null => false
    t.datetime "updated_at",                               :null => false
  end

  create_table "moders", :force => true do |t|
    t.string   "hashed_password"
    t.integer  "level"
    t.datetime "created_at",      :null => false
    t.datetime "updated_at",      :null => false
  end

  add_index "moders", ["hashed_password"], :name => "index_moders_on_hashed_password", :unique => true

  create_table "motds", :force => true do |t|
    t.text     "message"
    t.integer  "moder_id"
    t.datetime "created_at", :null => false
    t.datetime "updated_at", :null => false
  end

  create_table "r_files", :force => true do |t|
    t.string   "filename"
    t.string   "md5_hash"
    t.string   "extension"
    t.integer  "size"
    t.integer  "uploads_count",  :default => 0
    t.integer  "columns"
    t.integer  "rows"
    t.boolean  "resized",        :default => false
    t.datetime "created_at",                        :null => false
    t.datetime "updated_at",                        :null => false
    t.integer  "thumb_columns"
    t.integer  "thumb_rows"
    t.string   "video_title"
    t.integer  "video_duration"
  end

  create_table "r_posts", :force => true do |t|
    t.text     "message"
    t.text     "replies_rids"
    t.string   "password"
    t.string   "title"
    t.integer  "rid"
    t.integer  "r_file_id"
    t.integer  "r_thread_id"
    t.integer  "ip_id"
    t.boolean  "sage",             :default => false
    t.datetime "created_at",                          :null => false
    t.datetime "updated_at",                          :null => false
    t.integer  "defence_token_id"
  end

  add_index "r_posts", ["defence_token_id"], :name => "index_r_posts_on_defence_token_id"
  add_index "r_posts", ["ip_id"], :name => "index_r_posts_on_ip_id"
  add_index "r_posts", ["r_file_id"], :name => "index_r_posts_on_r_file_id"
  add_index "r_posts", ["r_thread_id"], :name => "index_r_posts_on_r_thread_id"
  add_index "r_posts", ["rid"], :name => "index_r_posts_on_rid", :unique => true

  create_table "r_threads", :force => true do |t|
    t.text     "message"
    t.text     "replies_rids"
    t.string   "password"
    t.string   "title"
    t.integer  "rid"
    t.integer  "r_file_id"
    t.integer  "ip_id"
    t.integer  "replies_count",    :default => 0
    t.integer  "replies_files",    :default => 0
    t.boolean  "sticky",           :default => false
    t.boolean  "closed",           :default => false
    t.datetime "bump"
    t.datetime "created_at",                          :null => false
    t.datetime "updated_at",                          :null => false
    t.integer  "defence_token_id"
    t.boolean  "old"
  end

  add_index "r_threads", ["defence_token_id"], :name => "index_r_threads_on_defence_token_id"
  add_index "r_threads", ["ip_id"], :name => "index_r_threads_on_ip_id"
  add_index "r_threads", ["old"], :name => "index_r_threads_on_old"
  add_index "r_threads", ["r_file_id"], :name => "index_r_threads_on_r_file_id"
  add_index "r_threads", ["rid"], :name => "index_r_threads_on_rid", :unique => true

  create_table "r_threads_tags", :force => true do |t|
    t.integer "r_thread_id"
    t.integer "tag_id"
  end

  create_table "settings", :force => true do |t|
    t.text     "allowed_file_types"
    t.integer  "max_file_size",           :default => 3145728
    t.integer  "threads_per_page",        :default => 10
    t.integer  "max_threads",             :default => 1000
    t.integer  "bump_limit",              :default => 500
    t.integer  "max_references_per_post", :default => 10
    t.datetime "created_at",                                   :null => false
    t.datetime "updated_at",                                   :null => false
    t.text     "defence"
  end

  create_table "settings_records", :force => true do |t|
    t.text     "allowed_file_types"
    t.integer  "max_file_size",           :default => 3145728
    t.integer  "threads_per_page",        :default => 10
    t.integer  "max_threads",             :default => 1000
    t.integer  "bump_limit",              :default => 500
    t.integer  "thread_posting_speed",    :default => 15
    t.integer  "reply_posting_speed",     :default => 5
    t.integer  "max_references_per_post", :default => 10
    t.datetime "created_at",                                   :null => false
    t.datetime "updated_at",                                   :null => false
    t.boolean  "defence_mode",            :default => false
    t.boolean  "spamtxt_enabled",         :default => false
    t.text     "spamtxt"
    t.boolean  "new_threads_to_trash",    :default => false
    t.boolean  "cookie_barrier",          :default => false
  end

  create_table "tags", :force => true do |t|
    t.string   "alias"
    t.string   "name"
    t.text     "settings"
    t.datetime "created_at", :null => false
    t.datetime "updated_at", :null => false
  end

  add_index "tags", ["alias"], :name => "index_tags_on_alias", :unique => true

  create_table "users", :force => true do |t|
    t.string   "hashname"
    t.text     "settings"
    t.datetime "created_at", :null => false
    t.datetime "updated_at", :null => false
    t.text     "hidden"
    t.text     "seen"
    t.text     "favorites"
  end

  add_index "users", ["hashname"], :name => "index_users_on_hashname", :unique => true

end
