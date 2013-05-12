class CreateRThreads < ActiveRecord::Migration
  def change
    create_table :r_threads do |t|
      t.text      :message
      t.text      :replies_rids
      t.string    :password
      t.string    :title
      t.integer   :rid
      t.integer   :r_file_id
      t.integer   :ip_id
      t.integer   :replies_count,   default: 0
      t.integer   :replies_files,   default: 0
      t.boolean   :sticky,          default: false
      t.boolean   :closed,          default: false
      t.datetime  :bump

      t.timestamps
    end

    add_index :r_threads, :ip_id
    add_index :r_threads, :r_file_id
    add_index :r_threads, :rid,       unique: true
  end
end
