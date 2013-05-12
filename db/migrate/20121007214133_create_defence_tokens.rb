class CreateDefenceTokens < ActiveRecord::Migration
  def change
    create_table :defence_tokens do |t|
      t.string :hashname, unique: true
      t.timestamps
    end
    create_table :settings do |t|
      t.text     "allowed_file_types"
      t.integer  "max_file_size",           :default => 3145728
      t.integer  "threads_per_page",        :default => 10
      t.integer  "max_threads",             :default => 500
      t.integer  "bump_limit",              :default => 500
      t.integer  "max_references_per_post", :default => 10
      t.datetime "created_at",                                   :null => false
      t.datetime "updated_at",                                   :null => false
      t.text     "defence"
    end

    add_column :r_threads, :defence_token_id, :integer
    add_index  :r_threads, :defence_token_id
    add_column :r_posts,   :defence_token_id, :integer
    add_index  :r_posts,   :defence_token_id
    add_index  :defence_tokens, :hashname, unique: true
  end
end
