class CreateRFiles < ActiveRecord::Migration
  def change
    create_table :r_files do |t|
      t.string    :filename
      t.string    :md5_hash
      t.string    :extension
      t.integer   :size
      t.integer   :uploads_count, default: 0 # i'm not using this anymore
      # picture
      t.boolean   :resized,       default: false
      t.integer   :columns
      t.integer   :rows
      t.integer   :thumb_columns
      t.integer   :thumb_rows
      # video
      t.string    :video_title
      t.integer   :video_duration

      t.timestamps
    end
  end
end
