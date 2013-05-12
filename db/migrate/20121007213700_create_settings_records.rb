class CreateSettingsRecords < ActiveRecord::Migration
  def change
    create_table :settings_records do |t|
      t.text      :allowed_file_types
      t.text      :spamtxt
      t.integer   :max_file_size,         default: 10485760
      t.integer   :threads_per_page,      default: 10 # deprecated
      t.integer   :max_threads,           default: 1000
      t.integer   :bump_limit,            default: 500
      t.integer   :thread_posting_speed,  default: 120
      t.integer   :reply_posting_speed,   default: 5
      t.boolean   :defence_mode,          default: false
      t.boolean   :spamtxt_enabled,       default: false
      t.boolean   :new_threads_to_trash,  default: false

      t.timestamps
    end
  end
end
