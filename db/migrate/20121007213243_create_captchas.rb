class CreateCaptchas < ActiveRecord::Migration
  def change
    create_table :captchas do |t|
      t.string      :word
      t.integer     :key
      t.boolean     :defensive, default: false

      t.timestamps
    end

    add_index :captchas,  :defensive
    add_index :captchas,  :word,      unique: true
    add_index :captchas,  :key,       unique: true
  end
end
