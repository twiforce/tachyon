class CreateAdminLogEntries < ActiveRecord::Migration
  def change
    create_table :admin_log_entries do |t|
      t.string    :message
      t.integer   :moder_id
      t.timestamps
    end
  end
end
