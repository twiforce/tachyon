class CreateRPosts < ActiveRecord::Migration
  def change
    create_table :r_posts do |t|
      t.text      :message
      t.text      :replies_rids
      t.string    :password
      t.string    :title
      t.integer   :rid
      t.integer   :r_file_id
      t.integer   :r_thread_id
      t.integer   :ip_id
      t.boolean   :sage,        default: false

      t.timestamps
    end

    add_index :r_posts, :ip_id
    add_index :r_posts, :r_file_id
    add_index :r_posts, :r_thread_id
    add_index :r_posts, :rid,         unique: true
  end
end
