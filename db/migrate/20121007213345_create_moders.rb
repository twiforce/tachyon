class CreateModers < ActiveRecord::Migration
  def change
    create_table :moders do |t|
      t.string  :hashed_password
      t.integer :level
      
      t.timestamps
    end

    add_index :moders, :hashed_password, unique: true
  end
end
