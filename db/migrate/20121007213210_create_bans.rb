class CreateBans < ActiveRecord::Migration
  def change
    create_table :bans do |t|
      t.string      :reason
      t.integer     :level
      t.integer     :ip_id
      t.integer     :moder_id
      t.datetime    :expires
      
      t.timestamps
    end
  end
end
