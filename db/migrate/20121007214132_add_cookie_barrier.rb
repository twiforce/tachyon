class AddCookieBarrier < ActiveRecord::Migration
  def change
    add_column :settings_records, :cookie_barrier, :boolean, default: false
  end
end
