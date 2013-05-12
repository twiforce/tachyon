class CreateMotds < ActiveRecord::Migration
  def change
    create_table :motds do |t|
      t.text      :message
      t.integer   :moder_id
      
      t.timestamps
    end
  end
end
