class RefactorModlogs < ActiveRecord::Migration
  def change
    AdminLogEntry.delete_all
    remove_column   :admin_log_entries,   :message
    add_column      :admin_log_entries,   :target,    :string
    add_column      :admin_log_entries,   :action,    :string
    add_column      :admin_log_entries,   :reason,    :string
    add_index       :admin_log_entries,   :moder_id,            unique: false
  end
end
