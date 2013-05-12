class CreateIps < ActiveRecord::Migration
  def change
    create_table :ips do |t|
      t.string    :address
      t.datetime  :last_post
      t.datetime  :last_thread
      t.boolean   :thread_captcha_needed, default: false
      t.boolean   :post_captcha_needed,   default: false

      t.timestamps
    end

    add_index :ips, :address, unique: true
  end
end
